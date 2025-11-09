import { useState, ChangeEvent, MutableRefObject } from "react";

export function TypeInput({
  reference,
  onChange,  // 🔥 Pass the change event to the parent component
}: {
  reference: MutableRefObject<HTMLSelectElement | null>;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void; // Added prop
}) {
  type ContentType = "youtube" | "twitter" | "document" | "link";
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
    <div className="flex w-full h-10 justify-center gap-4">
      <div className="flex text-xl font-medium">Type :</div>
      <select
        ref={reference}
        className="w-3/5 text-md p-2 text-gray-500 cursor-pointer items-center h-full border-2 rounded-md"
        name="Type"
        id="type"
        value={type}
        onChange={handleChange} // 🔥 Now properly handles updates
      >
        <option value="youtube">YouTube</option>
        <option value="twitter">Twitter</option>
        <option value="document">Document</option>
        <option value="link">Link</option>
      </select>
    </div>
  );
}
