import { MutableRefObject } from "react";

type InputProps = {
  reference: MutableRefObject<HTMLInputElement | null>;
  placeholder: string;
  title?: string;
};

export function Input({ reference, placeholder, title }: InputProps) {
  return (
    <div className="h-8 w-full flex gap-4 items-center justify-center">
      <div className="flex text-xl font-medium">{title}</div>
      <input
        ref={reference}
        className="w-3/5 h-full p-4 border-2 rounded-md"
        type="text"
        placeholder={placeholder}
      />
    </div>
  );
}
