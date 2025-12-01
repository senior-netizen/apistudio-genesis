import { useState } from 'react';

export interface HubPublishFormProps {
  onSubmit?: (payload: HubPublishPayload) => void;
}

export interface HubPublishPayload {
  title: string;
  description: string;
  priceUsd: number;
  tags: string[];
  visibility: 'public' | 'private';
}

export function HubPublishForm({ onSubmit }: HubPublishFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsd, setPriceUsd] = useState(0);
  const [tags, setTags] = useState<string>('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.({
      title,
      description,
      priceUsd,
      tags: tags.split(',').map((tag) => tag.trim()).filter(Boolean),
      visibility,
    });
  };

  return (
    <form className="hub-publish-form" onSubmit={handleSubmit}>
      <h2>Publish an API</h2>
      <label>
        Title
        <input value={title} onChange={(event) => setTitle(event.target.value)} required />
      </label>
      <label>
        Description
        <textarea value={description} onChange={(event) => setDescription(event.target.value)} required />
      </label>
      <label>
        Price (USD)
        <input
          type="number"
          min={0}
          value={priceUsd}
          onChange={(event) => setPriceUsd(Number(event.target.value))}
        />
      </label>
      <label>
        Tags (comma separated)
        <input value={tags} onChange={(event) => setTags(event.target.value)} />
      </label>
      <label>
        Visibility
        <select value={visibility} onChange={(event) => setVisibility(event.target.value as 'public' | 'private')}>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
      </label>
      <button type="submit">Publish to Hub</button>
    </form>
  );
}

export default HubPublishForm;
