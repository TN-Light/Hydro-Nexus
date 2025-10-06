"use client"

import { useState, useEffect } from 'react';
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, VoiceAssistantControlBar } from '@livekit/components-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
import '@livekit/components-styles/index.css';

interface JarvisAssistantProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function VoiceAssistantUI() {
  const { state, audioTrack } = useVoiceAssistant();
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([]);

  useEffect(() => {
    if (state === 'speaking') {
      // Could track what Jarvis is saying here
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center justify-center space-y-6 p-6">
      {/* Status Indicator */}
      <div className="text-center space-y-2">
        <div className="relative">
          <div className={`w-24 h-24 rounded-full flex items-center justify-center ${
            state === 'listening' 
              ? 'bg-green-500/20 border-2 border-green-500 animate-pulse' 
              : state === 'speaking'
              ? 'bg-blue-500/20 border-2 border-blue-500 animate-pulse'
              : state === 'thinking'
              ? 'bg-yellow-500/20 border-2 border-yellow-500 animate-spin'
              : 'bg-gray-500/20 border-2 border-gray-500'
          }`}>
            {state === 'listening' || state === 'speaking' ? (
              <Mic className="w-10 h-10 text-white" />
            ) : (
              <MicOff className="w-10 h-10 text-white" />
            )}
          </div>
        </div>
        
        <div className="space-y-1">
          <p className="text-lg font-semibold">
            {state === 'listening' && '🎤 Listening...'}
            {state === 'thinking' && '🤔 Thinking...'}
            {state === 'speaking' && '🗣️ Jarvis is speaking...'}
            {state === 'idle' && '💤 Ready'}
          </p>
          <p className="text-sm text-gray-500">
            {state === 'listening' && 'Say something to Jarvis'}
            {state === 'thinking' && 'Processing your request'}
            {state === 'speaking' && 'Speaking response'}
            {state === 'idle' && 'Click start to begin'}
          </p>
        </div>
      </div>

      {/* Audio Visualizer */}
      {audioTrack && (
        <Card className="w-full max-w-md p-4 bg-gradient-to-r from-green-500/10 to-emerald-500/10 border-green-500/20">
          <BarVisualizer
            state={state}
            barCount={25}
            trackRef={audioTrack}
            className="h-16"
            options={{
              minHeight: 8,
              maxHeight: 60,
            }}
          />
        </Card>
      )}

      {/* Control Bar */}
      <div className="w-full max-w-md">
        <VoiceAssistantControlBar controls={{ leave: false }} />
      </div>

      {/* Transcript Area */}
      <Card className="w-full max-w-2xl p-4 bg-black/20 border-green-500/20 max-h-64 overflow-y-auto">
        <div className="space-y-3">
          <div className="flex items-center space-x-2 mb-2">
            <Volume2 className="w-4 h-4 text-green-500" />
            <span className="text-sm font-semibold text-green-500">Conversation</span>
          </div>
          {transcript.length === 0 ? (
            <p className="text-sm text-gray-400 italic">Start talking to see the transcript...</p>
          ) : (
            transcript.map((entry, idx) => (
              <div key={idx} className={`text-sm ${
                entry.speaker === 'user' ? 'text-white' : 'text-green-400'
              }`}>
                <span className="font-semibold">{entry.speaker === 'user' ? 'You' : 'Jarvis'}:</span>{' '}
                {entry.text}
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Tips */}
      <Card className="w-full max-w-2xl p-4 bg-green-500/5 border-green-500/20">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-green-500">💡 Try asking:</p>
          <ul className="text-xs text-gray-400 space-y-1 pl-4">
            <li>"What's the room temperature?"</li>
            <li>"Check moisture levels for all bags"</li>
            <li>"Analyze system conditions"</li>
            <li>"Turn on water pump for bag 1"</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}

export function JarvisAssistant({ open, onOpenChange }: JarvisAssistantProps) {
  const [token, setToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (open && !token) {
      fetchToken();
    }
  }, [open]);

  const fetchToken = async () => {
    setIsConnecting(true);
    try {
      const response = await fetch('/api/livekit/token?room=hydro-nexus-voice&participant=User');
      const data = await response.json();
      setToken(data.token);
    } catch (error) {
      console.error('Error fetching LiveKit token:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-green-500/30">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            🤖 Jarvis AI Assistant
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Your AI-powered hydroponic system manager
          </DialogDescription>
        </DialogHeader>

        {isConnecting ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-gray-400">Connecting to Jarvis...</p>
          </div>
        ) : token ? (
          <LiveKitRoom
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://qbthydronet-yogkhtx9.livekit.cloud'}
            connect={true}
            audio={true}
            video={false}
            className="min-h-[500px]"
          >
            <VoiceAssistantUI />
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <p className="text-sm text-gray-400">Failed to connect. Please try again.</p>
            <Button onClick={fetchToken} variant="outline" className="border-green-500/30">
              Retry Connection
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Floating Button Component
export function JarvisButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 shadow-lg shadow-green-500/50 transition-all hover:scale-110 z-50"
        size="icon"
      >
        <div className="flex flex-col items-center">
          <Mic className="w-6 h-6" />
          <span className="text-[8px] mt-0.5">Jarvis</span>
        </div>
      </Button>

      <JarvisAssistant open={open} onOpenChange={setOpen} />
    </>
  );
}
