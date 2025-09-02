import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface SignupPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action: string; // e.g., "like this video", "follow this creator", "comment"
}

export default function SignupPrompt({ open, onOpenChange, action }: SignupPromptProps) {
  const navigate = useNavigate();

  const handleSignup = () => {
    onOpenChange(false);
    navigate('/auth');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Join to {action}</DialogTitle>
          <DialogDescription>
            Sign up for free to {action} and connect with creators.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-4">
          <Button onClick={handleSignup} className="w-full">
            Sign up
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="w-full">
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}