<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommunityPost extends Model
{
    protected $fillable = ['author', 'content', 'verified', 'likes', 'type'];
}
