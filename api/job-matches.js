import supabase, { ensureAwake } from './_supabase.js';

// Simulated job matching based on resume content
function matchJobs(resumeContent) {
  const lowerContent = resumeContent.toLowerCase();
  const allJobs = [
    { title: 'Full Stack Developer', company: 'TechCorp', location: 'Bangalore', salary: '₹8-12 LPA', match: 0, portal: 'naukri', url: 'https://naukri.com/job/12345', job_type: 'On-site' },
    { title: 'Frontend Developer', company: 'StartupXYZ', location: 'Remote', salary: '₹6-10 LPA', match: 0, portal: 'internshala', url: 'https://internshala.com/job/67890', job_type: 'Remote' },
    { title: 'Backend Engineer', company: 'CloudSoft', location: 'Hyderabad', salary: '₹10-15 LPA', match: 0, portal: 'linkedin', url: 'https://linkedin.com/jobs/view/11111', job_type: 'On-site' },
    { title: 'DevOps Engineer', company: 'InfraTech', location: 'Pune', salary: '₹12-18 LPA', match: 0, portal: 'naukri', url: 'https://naukri.com/job/22222', job_type: 'On-site' },
    { title: 'Data Analyst', company: 'DataCo', location: 'Mumbai', salary: '₹7-11 LPA', match: 0, portal: 'company_website', url: 'https://dataco.com/careers/analyst', job_type: 'On-site' },
    { title: 'Software Engineer Intern', company: 'MegaCorp', location: 'Delhi', salary: '₹20k/month', match: 0, portal: 'internshala', url: 'https://internshala.com/job/33333', job_type: 'On-site' },
    { title: 'ML Engineer', company: 'AI Labs', location: 'Bangalore', salary: '₹15-25 LPA', match: 0, portal: 'linkedin', url: 'https://linkedin.com/jobs/view/44444', job_type: 'Remote' },
    { title: 'React Developer', company: 'WebStudio', location: 'Remote', salary: '₹8-14 LPA', match: 0, portal: 'company_website', url: 'https://webstudio.io/jobs/react-dev', job_type: 'Remote' }
  ];

  const skillMatches = {
    'react': ['Full Stack Developer', 'Frontend Developer', 'React Developer'],
    'node': ['Full Stack Developer', 'Backend Engineer'],
    'python': ['Backend Engineer', 'Data Analyst', 'ML Engineer'],
    'docker': ['DevOps Engineer', 'Backend Engineer'],
    'kubernetes': ['DevOps Engineer'],
    'sql': ['Data Analyst', 'Backend Engineer'],
    'aws': ['DevOps Engineer', 'Backend Engineer'],
    'machine learning': ['ML Engineer', 'Data Analyst'],
    'javascript': ['Full Stack Developer', 'Frontend Developer', 'React Developer']
  };

  allJobs.forEach(job => {
    let score = 50; // base match
    Object.keys(skillMatches).forEach(skill => {
      if (lowerContent.includes(skill) && skillMatches[skill].includes(job.title)) {
        score += 10;
      }
    });
    job.match = Math.min(100, score);
  });

  return allJobs.sort((a, b) => b.match - a.match);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  await ensureAwake();

  try {
    if (req.method === 'POST') {
      const { resume_id } = req.body;
      if (!resume_id) {
        return res.status(400).json({ error: 'Missing resume_id' });
      }

      const { data: resume, error: resumeError } = await supabase
        .from('resumes')
        .select('*')
        .eq('id', resume_id)
        .single();
      if (resumeError) throw resumeError;

      const matches = matchJobs(resume.content);

      const insertData = matches.map(job => ({
        resume_id,
        job_title: job.title,
        company: job.company,
        location: job.location,
        salary: job.salary,
        match_score: job.match,
        portal: job.portal,
        job_url: job.url,
        job_type: job.job_type
      }));

      const { data, error } = await supabase
        .from('job_matches')
        .insert(insertData)
        .select();
      if (error) throw error;

      return res.status(201).json(data);
    }

    if (req.method === 'GET') {
      const { resume_id } = req.query;
      // NOTE: Supabase builder is immutable — must reassign to apply filters
      let query = supabase.from('job_matches').select('*').order('match_score', { ascending: false });
      if (resume_id) query = query.eq('resume_id', parseInt(resume_id));
      
      const { data, error } = await query;
      if (error) throw error;
      return res.status(200).json(data);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
