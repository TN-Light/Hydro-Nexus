"use client"

import { useState, useEffect } from 'react';
import { LiveKitRoom, useVoiceAssistant, BarVisualizer, RoomAudioRenderer, VoiceAssistantControlBar } from '@livekit/components-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Mic, MicOff, Sparkles, Waves, Leaf, Droplet } from 'lucide-react';
import '@livekit/components-styles/index.css';

interface QubitAssistantProps {
  open: boolean;
  onOpenChangeAction?: (open: boolean) => void;
}

function VoiceAssistantUI() {
  const { state, audioTrack } = useVoiceAssistant();
  const [transcript, setTranscript] = useState<Array<{ speaker: string; text: string }>>([]);

  useEffect(() => {
    if (state === 'speaking') {
      // Could track what Qubit is saying here
    }
  }, [state]);

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-8">
      {/* Modern Orb Visualizer - Gemini/Siri Style */}
      <div className="relative">
        {/* Outer glow rings */}
        <div className={`absolute inset-0 rounded-full transition-all duration-500 ${
          state === 'listening' 
            ? 'animate-ping bg-blue-500/30' 
            : state === 'speaking'
            ? 'animate-pulse bg-gradient-to-r from-cyan-500/30 to-blue-500/30'
            : state === 'thinking'
            ? 'animate-pulse bg-purple-500/30'
            : 'bg-slate-500/10'
        }`} style={{ animationDuration: '2s' }}></div>
        
        {/* Main orb */}
        <div className={`relative w-40 h-40 rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-300 ${
          state === 'listening' 
            ? 'bg-gradient-to-br from-blue-400/80 via-cyan-500/80 to-blue-600/80 shadow-2xl shadow-blue-500/50 scale-110' 
            : state === 'speaking'
            ? 'bg-gradient-to-br from-cyan-400/80 via-blue-500/80 to-indigo-600/80 shadow-2xl shadow-cyan-500/50 scale-110'
            : state === 'thinking'
            ? 'bg-gradient-to-br from-purple-400/80 via-violet-500/80 to-purple-600/80 shadow-2xl shadow-purple-500/50 scale-105'
            : 'bg-gradient-to-br from-slate-400/50 via-slate-500/50 to-slate-600/50 shadow-lg'
        }`}>
          {/* Inner glow */}
          <div className="absolute inset-4 rounded-full bg-white/20 backdrop-blur-sm"></div>
          
          {/* Icon */}
          <div className="relative z-10">
            {state === 'listening' ? (
              <Waves className="w-16 h-16 text-white drop-shadow-lg animate-pulse" />
            ) : state === 'speaking' ? (
              <Sparkles className="w-16 h-16 text-white drop-shadow-lg animate-pulse" />
            ) : state === 'thinking' ? (
              <div className="relative">
                <Leaf className="w-16 h-16 text-white drop-shadow-lg animate-spin" style={{ animationDuration: '3s' }} />
                <Droplet className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            ) : (
              <Mic className="w-16 h-16 text-white/70 drop-shadow-lg" />
            )}
          </div>
          
          {/* Particle effects for active states */}
          {(state === 'listening' || state === 'speaking') && (
            <>
              <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0s' }}></div>
              <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '0.5s' }}></div>
              <div className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/60 rounded-full animate-ping" style={{ animationDelay: '1s' }}></div>
            </>
          )}
        </div>
      </div>

      {/* Status Text - Gemini Style */}
      <div className="text-center space-y-2">
        <h3 className={`text-2xl font-semibold transition-colors duration-300 ${
          state === 'listening' 
            ? 'text-blue-500 dark:text-blue-400' 
            : state === 'speaking'
            ? 'text-cyan-500 dark:text-cyan-400'
            : state === 'thinking'
            ? 'text-purple-500 dark:text-purple-400'
            : 'text-slate-500 dark:text-slate-400'
        }`}>
          {state === 'listening' && 'Listening...'}
          {state === 'thinking' && 'Processing...'}
          {state === 'speaking' && 'Speaking...'}
          {state === 'connecting' && 'Connecting...'}
          {!state && 'Ready to assist'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {state === 'listening' && 'Speak naturally, I\'m listening'}
          {state === 'thinking' && 'Analyzing your request'}
          {state === 'speaking' && 'Playing response'}
          {state === 'connecting' && 'Establishing connection...'}
          {!state && 'Tap the mic to start a conversation'}
        </p>
      </div>

      {/* Audio Visualizer - Modern Style */}
      {audioTrack && (
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-500/10 via-cyan-500/10 to-blue-500/10 backdrop-blur-sm border border-blue-500/20 p-6">
            <BarVisualizer
              state={state}
              barCount={30}
              trackRef={audioTrack}
              className="h-20"
              options={{
                minHeight: 4,
                maxHeight: 80,
              }}
            />
          </div>
        </div>
      )}

      {/* Control Bar - Minimalist Style */}
      <div className="w-full max-w-md">
        <div className="rounded-full bg-background/50 backdrop-blur-sm border shadow-lg overflow-hidden">
          <VoiceAssistantControlBar controls={{ leave: false }} />
        </div>
      </div>

      {/* Quick Suggestions - iPhone Siri Style */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 hover:from-blue-500/20 hover:to-cyan-500/20 border border-blue-500/20 hover:border-blue-500/30 p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-blue-500">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">PAW status</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check plasma activation</p>
            </div>
          </div>
        </button>
        
        <button className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 hover:from-cyan-500/20 hover:to-blue-500/20 border border-cyan-500/20 hover:border-cyan-500/30 p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-cyan-500">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AMF network</p>
              <p className="text-xs text-muted-foreground mt-0.5">Monitor colonization</p>
            </div>
          </div>
        </button>
      </div>

      {/* Help Text - Subtle */}
      <p className="text-xs text-muted-foreground text-center max-w-md">
        Ask about PAW dosing, AMF colonization, substrate conditions, or to control the bioregenerative system
      </p>
    </div>
  );
}

export function QubitAssistant({ open, onOpenChangeAction = () => {} }: QubitAssistantProps) {
  const [token, setToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);

  // Fetch a fresh token every time the dialog opens
  useEffect(() => {
    if (open && !token) {
      fetchToken();
    }
    // Clear token when dialog closes to force new connection next time
    if (!open && token) {
      console.log('🔄 Dialog closed, clearing token for next connection');
      setToken('');
    }
  }, [open, token]);

  const fetchToken = async () => {
    setIsConnecting(true);
    try {
      // Generate unique room name for each session so agent creates new connection
      // This allows dev mode agent to handle multiple sequential connections
      const timestamp = Date.now();
      const roomName = `qbm-hydronet-${timestamp}`;
      const participantName = 'User';
      const response = await fetch(`/api/livekit/token?room=${roomName}&participant=${participantName}`);
      const data = await response.json();
      setToken(data.token);
      console.log('✅ Token fetched for room:', roomName);
    } catch (error) {
      console.error('Error fetching LiveKit token:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-cyan-50/30 dark:from-slate-950 dark:via-blue-950/30 dark:to-cyan-950/30 border-blue-500/20 dark:border-cyan-500/20 backdrop-blur-xl">
        <DialogHeader className="border-b border-border/50 pb-4">
          <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-600 dark:from-blue-400 dark:via-cyan-400 dark:to-blue-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-blue-500 dark:text-cyan-400" />
            Qubit AI Assistant
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            QBM-HydroNet Intelligent Control System
          </DialogDescription>
        </DialogHeader>

        {isConnecting ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
              <div className="absolute inset-0 w-20 h-20 border-4 border-cyan-500/20 border-b-cyan-500 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-medium text-foreground">Connecting to Qubit...</p>
              <p className="text-sm text-muted-foreground">Establishing secure connection</p>
            </div>
          </div>
        ) : token ? (
          <LiveKitRoom
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://qbthydronet-yogkhtx9.livekit.cloud'}
            connect={true}
            audio={true}
            video={false}
            className="min-h-[500px] overflow-y-auto"
          >
            <VoiceAssistantUI />
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <MicOff className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-medium text-foreground">Connection failed</p>
              <p className="text-sm text-muted-foreground">Unable to establish connection</p>
            </div>
            <Button onClick={fetchToken} variant="outline" className="border-blue-500/30 hover:bg-blue-500/10 hover:border-blue-500/50">
              Try Again
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// Floating Button Component - Gemini/Siri Style
export function QubitButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 via-cyan-500 to-blue-600 hover:from-blue-600 hover:via-cyan-600 hover:to-blue-700 shadow-2xl shadow-blue-500/50 hover:shadow-cyan-500/60 transition-all hover:scale-110 active:scale-95 z-50 border-2 border-white/20 backdrop-blur-sm"
        size="icon"
      >
        <div className="flex flex-col items-center">
          <Sparkles className="w-6 h-6 animate-pulse" />
          <span className="text-[9px] mt-0.5 font-medium">Qubit</span>
        </div>
      </Button>

      <QubitAssistant open={open} onOpenChangeAction={setOpen} />
    </>
  );
}
