import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Lead } from '@/types/leads';
import { useChatData } from '@/hooks/useChatData';
import { MessageSquareText, User, Loader2, AlertCircle } from 'lucide-react';

interface ChatHistoryDialogProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
}

export default function ChatHistoryDialog({ lead, open, onClose }: ChatHistoryDialogProps) {
  const { getMessagesForMobile, loading, error, configured } = useChatData();
  const chats = lead ? getMessagesForMobile(lead.mobile) : [];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquareText className="h-5 w-5 text-primary" />
            Baat-cheet History
          </DialogTitle>
          <DialogDescription>
            {lead?.patient_name} • {lead?.mobile}
          </DialogDescription>
        </DialogHeader>

        {!configured && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-warning/10 border border-warning/30 text-sm">
            <AlertCircle className="h-4 w-4 text-warning mt-0.5" />
            <p>Settings me Google Chat Sheet URL configure karein.</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}

        {error && configured && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm">
            <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
            <p>{error}</p>
          </div>
        )}

        {!loading && configured && chats.length === 0 && !error && (
          <div className="text-center py-8 text-sm text-muted-foreground">
            Is patient ke liye koi baat-cheet record nahi hai.
          </div>
        )}

        {chats.length > 0 && (
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-3">
              {chats.map((c, i) => (
                <div key={i} className="glass-card p-3 space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <User className="h-3 w-3" />
                      {c.sender || 'Staff'}
                    </span>
                    <span>{c.timestamp}</span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-wrap">{c.message}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
