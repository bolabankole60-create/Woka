import { Model } from '@nozbe/watermelondb';

interface CustomerRaw {
  id: string;
  created_at: number;
  updated_at: number;
  artisan_id: string;
  name: string;
  phone: string;
  normalized_phone: string;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_archived: boolean;
  archived_at: number | null;
  sync_status: string;
  client_version: number;
  server_version: number;
  last_synced_at: number | null;
}

export default class Customer extends Model {
  static table = 'customers';

  get createdAt(): Date {
    return new Date((this._raw as unknown as CustomerRaw).created_at);
  }

  get updatedAt(): Date {
    return new Date((this._raw as unknown as CustomerRaw).updated_at);
  }

  get artisanId(): string {
    return (this._raw as unknown as CustomerRaw).artisan_id;
  }

  get name(): string {
    return (this._raw as unknown as CustomerRaw).name;
  }

  get phone(): string {
    return (this._raw as unknown as CustomerRaw).phone;
  }

  get normalizedPhone(): string {
    return (this._raw as unknown as CustomerRaw).normalized_phone;
  }

  get email(): string | null {
    return (this._raw as unknown as CustomerRaw).email;
  }

  get address(): string | null {
    return (this._raw as unknown as CustomerRaw).address;
  }

  get notes(): string | null {
    return (this._raw as unknown as CustomerRaw).notes;
  }

  get isArchived(): boolean {
    return (this._raw as unknown as CustomerRaw).is_archived;
  }

  get archivedAt(): number | null {
    return (this._raw as unknown as CustomerRaw).archived_at;
  }

  get clientVersion(): number {
    return (this._raw as unknown as CustomerRaw).client_version;
  }

  get serverVersion(): number {
    return (this._raw as unknown as CustomerRaw).server_version;
  }

  get lastSyncedAt(): number | null {
    return (this._raw as unknown as CustomerRaw).last_synced_at;
  }
}
