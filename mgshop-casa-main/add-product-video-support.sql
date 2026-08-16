-- MGShop Casa - Supporto video nella galleria prodotti
-- Esegui questo script su Supabase > SQL Editor (una tantum)

alter table product_images
  add column if not exists media_type text not null default 'image';

alter table product_images
  drop constraint if exists product_images_media_type_check;

alter table product_images
  add constraint product_images_media_type_check check (media_type in ('image', 'video'));
