import { useState } from 'react';
import { Button } from './Button';
import { Icon } from './Icon';

interface CopyButtonProps {
  text: string;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'ghost' | 'mono' | 'outline';
}

export function CopyButton({ text, label = 'Copy', size = 'sm', variant = 'mono' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const onClick = () => {
    try {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore; clipboard write may fail on insecure contexts
    }
  };
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      icon={copied ? <Icon name="check" size={13} /> : <Icon name="copy" size={13} />}
    >
      {copied ? 'Copied' : label}
    </Button>
  );
}
