import { Entity, Column } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

@Entity('company_settings')
export class CompanySettings extends BaseEntity {
  @Column({ name: 'company_name' })
  companyName: string;

  @Column({ nullable: true })
  tagline?: string;

  @Column({ nullable: true })
  address?: string;

  @Column({ nullable: true })
  phone?: string;

  @Column({ nullable: true })
  email?: string;

  @Column({ nullable: true })
  website?: string;

  @Column({ name: 'tax_id', nullable: true })
  taxId?: string; // NPWP

  @Column({ nullable: true })
  logo?: string; // base64 or file path

  @Column({ name: 'receipt_header', nullable: true })
  receiptHeader?: string; // Custom text on receipt header

  @Column({ name: 'receipt_footer', nullable: true })
  receiptFooter?: string; // Custom text on receipt footer (e.g. "Terima kasih!")

  @Column({ name: 'po_footer', nullable: true })
  poFooter?: string; // Custom footer for PO documents
}
