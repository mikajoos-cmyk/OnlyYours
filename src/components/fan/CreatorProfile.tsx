import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { UsersIcon, GridIcon, VideoIcon } from 'lucide-react';
import SubscriptionModal from './SubscriptionModal';
import PostModal from './PostModal';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

export default function CreatorProfile() {
  const { id } = useParams();
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const creator = {
    id: id || '1',
    name: 'Sophia Laurent',
    avatar: 'https://placehold.co/100x100',
    banner: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
    bio: 'Fashion & Lifestyle Creator | Exklusive Inhalte nur für Abonnenten ✨',
    followers: 125000,
    subscriptionPrice: 19.99,
    isVerified: true,
  };

  const posts = [
    { 
      id: '1', 
      thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      type: 'image',
      caption: 'Exclusive behind the scenes from today\'s photoshoot ✨',
      hashtags: ['fashion', 'luxury', 'exclusive'],
      likes: 2340,
      comments: 156,
      isLiked: false,
    },
    { 
      id: '2', 
      thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      type: 'video',
      caption: 'Morning routine secrets revealed 💫',
      hashtags: ['fitness', 'wellness', 'lifestyle'],
      likes: 1890,
      comments: 98,
      isLiked: false,
    },
    { 
      id: '3', 
      thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      type: 'image',
      caption: 'New collection preview 🌟',
      hashtags: ['fashion', 'style'],
      likes: 3120,
      comments: 203,
      isLiked: false,
    },
    { 
      id: '4', 
      thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      type: 'video',
      caption: 'Behind the scenes vlog 🎬',
      hashtags: ['vlog', 'behindthescenes'],
      likes: 2567,
      comments: 134,
      isLiked: false,
    },
    { 
      id: '5', 
      thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      type: 'image',
      caption: 'Sunset vibes ☀️',
      hashtags: ['sunset', 'photography'],
      likes: 4230,
      comments: 287,
      isLiked: false,
    },
    { 
      id: '6', 
      thumbnail: 'https://c.animaapp.com/mgqoddesI6hoXr/img/ai_1.png',
      type: 'video',
      caption: 'Q&A Session 💬',
      hashtags: ['qanda', 'community'],
      likes: 1876,
      comments: 421,
      isLiked: false,
    },
  ];

  const handlePostClick = (post: any) => {
    setSelectedPost(post);
  };

  const filterPosts = (type?: string) => {
    if (!type) return posts;
    return posts.filter(post => post.type === type);
  };

  return (
    <>
      <div className="min-h-screen">
        <div className="relative h-64 md:h-80">
          <img
            src={creator.banner}
            alt="Banner"
            className="w-full h-full object-cover"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-background" />
        </div>

        <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10">
          <div className="flex flex-col items-center text-center space-y-4">
            <Avatar className="w-32 h-32 border-4 border-secondary">
              <AvatarImage src={creator.avatar} alt={creator.name} />
              <AvatarFallback className="bg-secondary text-secondary-foreground text-3xl">
                {creator.name.charAt(0)}
              </AvatarFallback>
            </Avatar>

            <div className="space-y-2">
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-3xl font-serif text-foreground">{creator.name}</h1>
                {creator.isVerified && (
                  <Badge className="bg-secondary text-secondary-foreground font-normal">
                    Verifiziert
                  </Badge>
                )}
              </div>
              <p className="text-muted-foreground max-w-md">{creator.bio}</p>
              <div className="flex items-center justify-center gap-2 text-foreground">
                <UsersIcon className="w-5 h-5" strokeWidth={1.5} />
                <span>{creator.followers.toLocaleString()} Follower</span>
              </div>
            </div>

            <Button
              onClick={() => setShowSubscriptionModal(true)}
              className="bg-secondary text-secondary-foreground hover:bg-secondary/90 px-8 py-6 text-base font-normal"
            >
              Abonnieren für {creator.subscriptionPrice}€/Monat
            </Button>
          </div>

          <div className="mt-16 mb-8">
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="bg-card border border-border w-full justify-start">
                <TabsTrigger value="all" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  <GridIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Alle
                </TabsTrigger>
                <TabsTrigger value="images" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  <GridIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Bilder
                </TabsTrigger>
                <TabsTrigger value="videos" className="data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                  <VideoIcon className="w-4 h-4 mr-2" strokeWidth={1.5} />
                  Videos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {posts.map((post) => (
                    <div
                      key={post.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                      onClick={() => handlePostClick(post)}
                    >
                      <img
                        src={post.thumbnail}
                        alt="Post"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {post.type === 'video' && (
                        <div className="absolute top-2 right-2">
                          <VideoIcon className="w-6 h-6 text-foreground drop-shadow-lg" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="text-lg font-medium">{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="text-lg font-medium">{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="images" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filterPosts('image').map((post) => (
                    <div
                      key={post.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                      onClick={() => handlePostClick(post)}
                    >
                      <img
                        src={post.thumbnail}
                        alt="Post"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="text-lg font-medium">{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="text-lg font-medium">{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="videos" className="mt-6">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {filterPosts('video').map((post) => (
                    <div
                      key={post.id}
                      className="relative aspect-square rounded-lg overflow-hidden cursor-pointer hover:opacity-80 transition-opacity group"
                      onClick={() => handlePostClick(post)}
                    >
                      <img
                        src={post.thumbnail}
                        alt="Post"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-2 right-2">
                        <VideoIcon className="w-6 h-6 text-foreground drop-shadow-lg" strokeWidth={1.5} />
                      </div>
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-6">
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="text-lg font-medium">{post.likes}</span>
                        </div>
                        <div className="flex items-center gap-2 text-foreground">
                          <span className="text-lg font-medium">{post.comments}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      <SubscriptionModal
        isOpen={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        creator={creator}
      />

      {selectedPost && (
        <PostModal
          isOpen={!!selectedPost}
          onClose={() => setSelectedPost(null)}
          post={selectedPost}
          creator={creator}
          allPosts={posts}
        />
      )}
    </>
  );
}
