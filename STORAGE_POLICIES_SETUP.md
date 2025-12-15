# Storage Policies Setup Guide

Since storage policies require special permissions in Supabase, you need to set them up manually through the dashboard.

## Option 1: Set up through Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Storage**
2. Click on the **uploads** bucket (or create it if it doesn't exist)
3. Go to the **Policies** tab
4. Click **New Policy**

### Create the following policies:

#### Policy 1: Allow Uploads
- **Policy Name**: `Authenticated users can upload`
- **Allowed Operation**: `INSERT`
- **Target Roles**: `authenticated`
- **Policy Definition**: `bucket_id = 'uploads'`

#### Policy 2: Allow Viewing
- **Policy Name**: `Authenticated users can view uploads`
- **Allowed Operation**: `SELECT`
- **Target Roles**: `authenticated`
- **Policy Definition**: `bucket_id = 'uploads'`

#### Policy 3: Allow Updates
- **Policy Name**: `Authenticated users can update uploads`
- **Allowed Operation**: `UPDATE`
- **Target Roles**: `authenticated`
- **Policy Definition**: `bucket_id = 'uploads'`

#### Policy 4: Allow Deletion
- **Policy Name**: `Authenticated users can delete uploads`
- **Allowed Operation**: `DELETE`
- **Target Roles**: `authenticated`
- **Policy Definition**: `bucket_id = 'uploads'`

## Option 2: Use Service Role Key

If you have access to the service role key, you can run the SQL below:

```sql
-- Allow authenticated users to upload to uploads bucket
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'uploads');

-- Allow authenticated users to view uploads bucket
CREATE POLICY "Authenticated users can view uploads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to update uploads bucket
CREATE POLICY "Authenticated users can update uploads"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'uploads');

-- Allow authenticated users to delete from uploads bucket
CREATE POLICY "Authenticated users can delete uploads"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'uploads');
```

## Option 3: More Restrictive Policies (Advanced)

If you want to restrict users to only their own folders:

```sql
-- Policy: Users can upload to their own folder only
CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can view their own documents
CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can update their own documents
CREATE POLICY "Users can update their own documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy: Users can delete their own documents
CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'uploads' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

## Verification

After setting up policies, verify they exist:

```sql
SELECT policyname, cmd, qual 
FROM pg_policies 
WHERE tablename = 'objects' 
AND schemaname = 'storage'
AND policyname LIKE '%upload%';
```

You should see 4 policies listed.

