import { Heart } from 'lucide-react';
import { toast } from 'sonner';
import { toUserMessage } from '@/lib/errors';
import { cn } from '@/lib/utils';
import { useToggleFavorite } from './api';

export function FavoriteButton({ lessonId, isFavorite, className, withLabel = false }: { lessonId: string; isFavorite: boolean; className?: string; withLabel?: boolean }) {
  const toggle = useToggleFavorite();
  const label = isFavorite ? 'Remove from favorites' : 'Add to favorites';

  return (
    <button
      type="button"
      aria-pressed={isFavorite}
      aria-label={withLabel ? undefined : label}
      title={label}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle.mutate({ lessonId, favorite: !isFavorite }, { onError: (err) => toast.error(toUserMessage(err)) });
      }}
      className={cn(
        'inline-flex items-center gap-2 rounded-full text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        withLabel ? 'h-9 border bg-card px-3 hover:bg-muted' : 'size-8 justify-center',
        className,
      )}
    >
      <Heart className={cn('size-4', isFavorite && 'fill-rose-500 text-rose-500')} aria-hidden />
      {withLabel && (isFavorite ? 'Favorited' : 'Favorite')}
    </button>
  );
}
