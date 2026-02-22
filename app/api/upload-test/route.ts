import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    console.log('📤 Upload test endpoint hit');
    
    // 1. Check authentication
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Authentication error', details: authError.message }, { status: 401 });
    }
    
    if (!user) {
      console.error('No user found');
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    
    console.log('✅ User authenticated:', user.id);
    
    // 2. Check form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      console.error('No file in request');
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }
    
    console.log('✅ File received:', {
      name: file.name,
      type: file.type,
      size: file.size
    });
    
    // 3. Check PDF type
    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'Only PDF files are allowed' }, { status: 400 });
    }
    
    console.log('✅ File is PDF');
    
    // 4. Check database connection
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, credits')
      .eq('id', user.id)
      .single();
    
    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return NextResponse.json({ error: 'Profile error', details: profileError.message }, { status: 500 });
    }
    
    console.log('✅ Profile found:', profile);
    
    return NextResponse.json({
      success: true,
      message: 'All checks passed!',
      user_id: user.id,
      file_name: file.name,
      file_size: file.size,
      credits: profile.credits
    });
    
  } catch (error: any) {
    console.error('❌ Upload test error:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
}
