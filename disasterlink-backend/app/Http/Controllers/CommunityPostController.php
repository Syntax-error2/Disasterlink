<?php

namespace App\Http\Controllers;

use App\Models\CommunityPost;
use Illuminate\Http\Request;

class CommunityPostController extends Controller
{
    public function index()
    {
        try {
            $lguId = auth()->check() ? auth()->user()->lgu_id : null;
            $query = CommunityPost::orderBy('created_at', 'desc');
            
            if ($lguId) {
                $query->where('lgu_id', $lguId);
            }
            
            $posts = $query->cursorPaginate(30)->through(function ($post) {
                if ($post->image_path) {
                    $post->image_url = asset('storage/' . $post->image_path);
                }
                $post->original_author = $post->author;
                if ($post->is_anonymous) {
                    $post->author = 'Anonymous Citizen';
                    if ($post->barangay) {
                        $post->barangay = 'Local Resident';
                    }
                }
                return $post;
            });
            return response()->json($posts, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            // Simple content moderation blocklist
            $bannedWords = ['spam', 'malicious', 'scam', 'abuse', 'stupid', 'idiot', 'fake'];
            $content = strtolower($request->input('content', ''));
            
            foreach ($bannedWords as $word) {
                if (str_contains($content, $word)) {
                    return response()->json(['message' => 'Post rejected: contains prohibited language or malicious content.'], 400);
                }
            }

            $imagePath = null;
            if ($request->hasFile('image')) {
                $imagePath = $request->file('image')->store('community', 'public');
            }

            $post = CommunityPost::create([
                'lgu_id'       => auth()->check() ? auth()->user()->lgu_id : null,
                'author'       => $request->input('author', 'Anonymous'),
                'content'      => $request->input('content'),
                'verified'     => filter_var($request->input('verified', false), FILTER_VALIDATE_BOOLEAN),
                'likes'        => 0,
                'type'         => $request->input('type', 'update'),
                'image_path'   => $imagePath,
                'barangay'     => $request->input('barangay', null),
                'is_anonymous' => filter_var($request->input('is_anonymous', false), FILTER_VALIDATE_BOOLEAN),
            ]);
            
            // Add full URL to image_path before returning if it exists
            if ($post->image_path) {
                $post->image_url = asset('storage/' . $post->image_path);
            }
            
            return response()->json($post, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function like($id)
    {
        try {
            $post = CommunityPost::findOrFail($id);
            $post->increment('likes');
            return response()->json(['message' => 'Post liked!', 'likes' => $post->likes], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $post = CommunityPost::findOrFail($id);
            
            if ($post->image_path) {
                \Illuminate\Support\Facades\Storage::disk('public')->delete($post->image_path);
            }
            
            $post->delete();
            return response()->json(['message' => 'Post deleted successfully'], 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }
}
