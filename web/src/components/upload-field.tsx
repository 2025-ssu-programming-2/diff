import * as React from 'react';
import { type ChangeEvent, useCallback, useRef, useEffect } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/shadcn.ts';
import { Input } from '@/components/shadcn/input.tsx';
import { InlineCode, Large, Muted, Small, Span } from '@/components/shadcn/typography.tsx';
import type { Nullish } from '@/types/common.ts';
import { convertBytes } from '@/utils/file.ts';
import { FileUp } from 'lucide-react';

const uploadFieldVariants = cva(
  'flex flex-col w-full h-[120px] border rounded-lg bg-muted justify-center items-center cursor-pointer',
);

export type UploadFieldProps = Omit<React.ComponentProps<'div'>, 'children' | 'onChange'> &
  VariantProps<typeof uploadFieldVariants> & {
    file: Nullish<File>;
    onChange: (file: File) => void;
  };

export default function UploadField({ className, file, onChange, ...props }: UploadFieldProps) {
  const inputRef = useRef<Nullish<HTMLInputElement>>(null);

  // file이 null이 되면 input 값을 리셋
  useEffect(() => {
    if (!file && inputRef.current) {
      inputRef.current.value = '';
    }
  }, [file]);

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

      // .txt 파일만 허용
      if (!selectedFile.name.endsWith('.txt')) {
        alert('.txt 파일만 업로드할 수 있습니다.');
        if (inputRef.current) {
          inputRef.current.value = '';
        }
        return;
      }

      onChange(selectedFile);
    },
    [onChange],
  );

  return (
    <>
      <Input type="file" accept=".txt" className="hidden" ref={inputRef} onChange={handleFileChange} />
      <div className={cn(uploadFieldVariants(), className)} {...props} onClick={onElementClick}>
        {!file && (
          <div className="flex h-full w-full flex-col items-center justify-center gap-3">
            <FileUp className="h-8 w-8" />

            <div className="flex flex-col items-center gap-1">
              <Large className="text-sm">비교할 파일을 업로드해주세요</Large>
              <Muted>
                <InlineCode className="text-xs font-thin">.txt 파일만 업로드할 수 있습니다</InlineCode>
              </Muted>
            </div>
          </div>
        )}
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
