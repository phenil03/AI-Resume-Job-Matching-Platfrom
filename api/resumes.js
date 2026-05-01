import supabase, { ensureAwake } from './_supabase.js';
import { getResumeText } from './_text-utils.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  await ensureAwake();

  try {
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('resumes')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }

    if (req.method === 'POST') {
      let { filename, content, file_type, is_binary } = req.body;
      if (!filename || !content) {
        return res.status(400).json({ error: 'Missing filename or content' });
      }

      const extractedText = await getResumeText({
        content,
        filename,
        fileType: file_type,
        isBinary: is_binary,
      });

      if (!extractedText) {
        return res.status(400).json({
          error: 'Could not extract readable text from this file. Please upload a text-based PDF or TXT resume.',
        });
      }

      const { data, error } = await supabase
        .from('resumes')
        .insert({ 
          filename, 
          content: extractedText, 
          file_type: file_type || 'application/pdf' 
        })
        .select()
        .single();
      if (error) throw error;
      return res.status(201).json(data);
    }

    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('resumes').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
