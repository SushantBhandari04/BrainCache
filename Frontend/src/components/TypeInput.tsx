import { useState, ChangeEvent, MutableRefObject } from "react";

export function TypeInput({
  reference,
  onChange,  // 🔥 Pass the change event to the parent component
}: {
  reference: MutableRefObject<HTMLSelectElement | null>;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void; // Added prop
}) {
  type ContentType = "youtube" | "twitter" | "document" | "link" | "article" | "note";
  const [type, setType] = useState<ContentType>("youtube");

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const selectedType = event.target.value as ContentType;
    setType(selectedType);
    if (reference.current) {
      reference.current.value = selectedType; // 🔥 Update the reference manually
    }
    onChange(event); // 🔥 Notify parent component
  };

  return (
    <select
      ref={reference}
      className="w-full px-4 py-3 text-sm text-gray-700 cursor-pointer border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition-all bg-white"
      name="Type"
      id="type"
      value={type}
      onChange={handleChange}
    >
      <option value="youtube">YouTube</option>
      <option value="twitter">Twitter / X</option>
      <option value="document">Document (PDF)</option>
      <option value="link">Web Link</option>
      <option value="article">Article</option>
      <option value="note">Note</option>
    </select>
  );
}
