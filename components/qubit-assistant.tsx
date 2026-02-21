"use client"

import { useState, useEffect } from 'react';
import {
  LiveKitRoom,
  useVoiceAssistant,
  BarVisualizer,
  RoomAudioRenderer,
  VoiceAssistantControlBar,
} from '@livekit/components-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Mic, MicOff, Sparkles, Waves, Leaf, Droplet } from 'lucide-react';
import '@livekit/components-styles/index.css';

interface QubitAssistantProps {
  open: boolean;
  onOpenChangeAction?: (open: boolean) => void;
}

// ── Voice Assistant UI ─────────────────────────────────────────────────────
function VoiceAssistantUI() {
  const { state, audioTrack } = useVoiceAssistant();

  return (
    <div className="flex flex-col items-center justify-center space-y-8 p-8">
      {/* Modern Orb Visualizer */}
      <div className="relative">
        {/* Outer glow rings */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-500 ${
            state === 'listening'
              ? 'animate-ping bg-green-500/30'
              : state === 'speaking'
              ? 'animate-pulse bg-gradient-to-r from-emerald-500/30 to-green-500/30'
              : state === 'thinking'
              ? 'animate-pulse bg-lime-500/30'
              : 'bg-slate-500/10'
          }`}
          style={{ animationDuration: '2s' }}
        />

        {/* Main orb */}
        <div
          className={`relative w-40 h-40 rounded-full flex items-center justify-center backdrop-blur-xl transition-all duration-300 ${
            state === 'listening'
              ? 'bg-gradient-to-br from-green-400/80 via-emerald-500/80 to-green-600/80 shadow-2xl shadow-green-500/50 scale-110'
              : state === 'speaking'
              ? 'bg-gradient-to-br from-emerald-400/80 via-green-500/80 to-teal-600/80 shadow-2xl shadow-emerald-500/50 scale-110'
              : state === 'thinking'
              ? 'bg-gradient-to-br from-lime-400/80 via-emerald-500/80 to-green-600/80 shadow-2xl shadow-lime-500/50 scale-105'
              : 'bg-gradient-to-br from-slate-400/50 via-slate-500/50 to-slate-600/50 shadow-lg'
          }`}
        >
          {/* Inner glow */}
          <div className="absolute inset-4 rounded-full bg-white/20 backdrop-blur-sm" />

          {/* Icon */}
          <div className="relative z-10">
            {state === 'listening' ? (
              <Waves className="w-16 h-16 text-white drop-shadow-lg animate-pulse" />
            ) : state === 'speaking' ? (
              <Sparkles className="w-16 h-16 text-white drop-shadow-lg animate-pulse" />
            ) : state === 'thinking' ? (
              <div className="relative">
                <Leaf
                  className="w-16 h-16 text-white drop-shadow-lg animate-spin"
                  style={{ animationDuration: '3s' }}
                />
                <Droplet className="w-6 h-6 text-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
              </div>
            ) : state === 'connecting' ? (
              <div className="w-14 h-14 border-4 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <Mic className="w-16 h-16 text-white/70 drop-shadow-lg" />
            )}
          </div>

          {/* Particle effects for active states */}
          {(state === 'listening' || state === 'speaking') && (
            <>
              <div
                className="absolute top-1/4 left-1/4 w-2 h-2 bg-white/60 rounded-full animate-ping"
                style={{ animationDelay: '0s' }}
              />
              <div
                className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-white/60 rounded-full animate-ping"
                style={{ animationDelay: '0.5s' }}
              />
              <div
                className="absolute bottom-1/3 left-1/3 w-1 h-1 bg-white/60 rounded-full animate-ping"
                style={{ animationDelay: '1s' }}
              />
            </>
          )}
        </div>
      </div>

      {/* Status Text */}
      <div className="text-center space-y-2">
        <h3
          className={`text-2xl font-semibold transition-colors duration-300 ${
            state === 'listening'
              ? 'text-green-500 dark:text-green-400'
              : state === 'speaking'
              ? 'text-emerald-500 dark:text-emerald-400'
              : state === 'thinking'
              ? 'text-lime-500 dark:text-lime-400'
              : 'text-slate-500 dark:text-slate-400'
          }`}
        >
          {state === 'listening' && 'Listening...'}
          {state === 'thinking' && 'Processing...'}
          {state === 'speaking' && 'Speaking...'}
          {state === 'connecting' && 'Connecting...'}
          {!state && 'Ready to assist'}
        </h3>
        <p className="text-sm text-muted-foreground">
          {state === 'listening' && "Speak naturally, I'm listening"}
          {state === 'thinking' && 'Analyzing your request'}
          {state === 'speaking' && 'Playing response'}
          {state === 'connecting' && 'Establishing connection...'}
          {!state && 'Tap the mic to start a conversation'}
        </p>
      </div>

      {/* Audio Visualizer */}
      {audioTrack && (
        <div className="w-full max-w-md">
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-green-500/10 via-emerald-500/10 to-green-500/10 backdrop-blur-sm border border-green-500/20 p-6">
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

      {/* Control Bar */}
      <div className="w-full max-w-md">
        <div className="rounded-full bg-background/50 backdrop-blur-sm border shadow-lg overflow-hidden">
          <VoiceAssistantControlBar controls={{ leave: false }} />
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-green-500/10 to-emerald-500/10 hover:from-green-500/20 hover:to-emerald-500/20 border border-green-500/20 hover:border-green-500/30 p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-green-500">
              <Droplet className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">PAW status</p>
              <p className="text-xs text-muted-foreground mt-0.5">Check plasma activation</p>
            </div>
          </div>
        </button>

        <button className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500/10 to-green-500/10 hover:from-emerald-500/20 hover:to-green-500/20 border border-emerald-500/20 hover:border-emerald-500/30 p-4 text-left transition-all duration-300 hover:scale-[1.02] hover:shadow-lg">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 text-emerald-500">
              <Leaf className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">AMF network</p>
              <p className="text-xs text-muted-foreground mt-0.5">Monitor colonization</p>
            </div>
          </div>
        </button>
      </div>

      {/* Help Text */}
      <p className="text-xs text-muted-foreground text-center max-w-md">
        Ask about PAW dosing, AMF colonization, substrate conditions, or to control the bioregenerative system
      </p>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────
export function QubitAssistant({ open, onOpenChangeAction = () => {} }: QubitAssistantProps) {
  const [token, setToken] = useState<string>('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (open && !token && !isConnecting) {
      fetchToken();
    }
    if (!open) {
      setToken('');
      setError('');
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Suppress LiveKit WebSocket [object Event] unhandled rejections
  useEffect(() => {
    const handler = (e: PromiseRejectionEvent) => {
      const reason = e.reason;
      if (
        reason instanceof Event ||
        (reason instanceof Error && reason.message === '[object Event]') ||
        (typeof reason === 'object' && reason !== null && reason.constructor?.name === 'Event')
      ) {
        e.preventDefault();
        console.warn('LiveKit connection event suppressed');
        setError('Voice connection failed — please try again');
        setToken('');
      }
    };
    window.addEventListener('unhandledrejection', handler);
    return () => window.removeEventListener('unhandledrejection', handler);
  }, []);

  const fetchToken = async () => {
    setIsConnecting(true);
    setError('');
    try {
      // Auto-start the agent
      const agentRes = await fetch('/api/agent/start', { method: 'POST' });
      const agentData = await agentRes.json();
      if (!agentRes.ok) throw new Error(agentData.error ?? 'Agent failed to start');

      const roomName = `qbm-hydronet-${Date.now()}`;
      const participantName = 'User';
      const res = await fetch(`/api/livekit/token?room=${roomName}&participant=${participantName}`);
      const data = await res.json();
      if (!data.token) throw new Error('No token received');
      setToken(data.token);
    } catch (err: unknown) {
      console.error('Error fetching LiveKit token:', err);
      setError(err instanceof Error ? err.message : 'Connection failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChangeAction}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden bg-gradient-to-br from-slate-50 via-green-50/30 to-emerald-50/30 dark:from-slate-950 dark:via-green-950/30 dark:to-emerald-950/30 border-green-500/20 dark:border-emerald-500/20 backdrop-blur-xl">
        <DialogHeader className="border-b border-border/50 pb-4">
          <DialogTitle className="text-2xl font-semibold bg-gradient-to-r from-green-600 via-emerald-600 to-green-600 dark:from-green-400 dark:via-emerald-400 dark:to-green-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-green-500 dark:text-emerald-400" />
            Qubit AI Assistant
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            QBM-HydroNet Intelligent Control System
          </DialogDescription>
        </DialogHeader>

        {isConnecting ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-green-500/30 border-t-green-500 rounded-full animate-spin" />
              <div
                className="absolute inset-0 w-20 h-20 border-4 border-emerald-500/20 border-b-emerald-500 rounded-full animate-spin"
                style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}
              />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-medium text-foreground">Connecting to Qubit...</p>
              <p className="text-sm text-muted-foreground">Establishing secure connection</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-6">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <MicOff className="w-8 h-8 text-destructive" />
            </div>
            <div className="text-center space-y-2">
              <p className="text-base font-medium text-foreground">Connection failed</p>
              <p className="text-sm text-muted-foreground max-w-[300px]">{error}</p>
            </div>
            <Button
              onClick={fetchToken}
              variant="outline"
              className="border-green-500/30 hover:bg-green-500/10 hover:border-green-500/50"
            >
              Try Again
            </Button>
          </div>
        ) : token ? (
          <LiveKitRoom
            token={token}
            serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL || 'wss://qbthydronet-yogkhtx9.livekit.cloud'}
            connect={true}
            audio={true}
            video={false}
            className="min-h-[500px] overflow-y-auto"
            onError={(err) => {
              console.error('LiveKit room error:', err);
              setError(err?.message || 'LiveKit connection failed');
              setToken('');
            }}
            onDisconnected={() => {
              console.log('LiveKit room disconnected');
              setToken('');
            }}
          >
            <VoiceAssistantUI />
            <RoomAudioRenderer />
          </LiveKitRoom>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

// ── Floating Button ────────────────────────────────────────────────────────
export function QubitButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-gradient-to-br from-green-500 via-emerald-500 to-green-600 hover:from-green-600 hover:via-emerald-600 hover:to-green-700 shadow-2xl shadow-green-500/50 hover:shadow-emerald-500/60 transition-all hover:scale-110 active:scale-95 z-50 border-2 border-white/20 backdrop-blur-sm"
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
