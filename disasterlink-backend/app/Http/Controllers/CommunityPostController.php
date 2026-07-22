<?php

namespace App\Http\Controllers;

use App\Models\CommunityPost;
use Illuminate\Http\Request;

class CommunityPostController extends Controller
{
    public function index()
    {
        try {
            $posts = CommunityPost::orderBy('created_at', 'desc')->get();
            return response()->json($posts, 200);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $post = CommunityPost::create([
                'author'   => $request->input('author', 'Anonymous'),
                'content'  => $request->input('content'),
                'verified' => $request->input('verified', false),
                'likes'    => 0,
                'type'     => $request->input('type', 'update'),
            ]);
            
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
}
