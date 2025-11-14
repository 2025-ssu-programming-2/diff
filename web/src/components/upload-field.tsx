import * as React from 'react';
import { type ChangeEvent, useCallback, useRef } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/shadcn.ts';
import { Input } from '@/components/shadcn/input.tsx';
import { Small, Span } from '@/components/shadcn/typography.tsx';
import type { Nullish } from '@/types/common.ts';
import { convertBytes } from '@/utils/file.ts';

const uploadFieldVariants = cva(
  'flex flex-col w-full h-[120px] border rounded-lg bg-muted justify-center items-center',
);

export type UploadFieldProps = Omit<React.ComponentProps<'div'>, 'children' | 'onChange'> &
  VariantProps<typeof uploadFieldVariants> & {
    file: Nullish<File>;
    onChange: (file: File) => void;
  };

export default function UploadField({ className, file, onChange, ...props }: UploadFieldProps) {
  const inputRef = useRef<Nullish<HTMLInputElement>>(null);

  const onElementClick = useCallback(() => {
    if (!inputRef || !inputRef?.current) {
      return;
    }

    inputRef.current.click();
  }, [inputRef]);

  const handleFileChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!event || !event?.target || !event.target?.files) {
        return;
      }

      const selectedFile: File = event.target.files[0];

      onChange(selectedFile);
    },
    [onChange],
  );

  return (
    <>
      <Input type="file" className="hidden" ref={inputRef} onChange={handleFileChange} />
      <div className={cn(uploadFieldVariants(), className)} {...props} onClick={onElementClick}>
        {!file && <Small>파일을 업로드해주세요</Small>}
        {file && (
          <>
            <Span className="font-bold">{file.name}</Span>
            <Span>{Math.round(convertBytes(file.size).kb)} KB</Span>
          </>
        )}
      </div>
    </>
  );
}
