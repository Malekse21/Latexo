import { createClient } from './server';

/**
 * Permanently deletes all reports and associated data for a user.
 * This includes: simulations, files in 'pfes' bucket, and thumbnails.
 */
export async function deleteUserReports(userId: string) {
  const supabase = await createClient();

  // 1. Get all reports for the user
  const { data: reports, error: reportsError } = await supabase
    .from('reports')
    .select('id, file_path, thumbnail_url')
    .eq('user_id', userId);

  if (reportsError) {
    console.error('Error fetching reports for cleanup:', reportsError);
    return { error: reportsError };
  }

  if (!reports || reports.length === 0) {
    return { success: true, message: 'No reports to delete' };
  }

  const reportIds = reports.map(r => r.id);

  // 2. Delete all simulations linked to these reports
  const { error: simError } = await supabase
    .from('simulations')
    .delete()
    .in('report_id', reportIds);

  if (simError) {
    console.error('Error deleting simulations:', simError);
  }

  // 3. Delete files from Storage
  for (const report of reports) {
    // Delete PDF
    if (report.file_path) {
      const { error: pdfError } = await supabase.storage
        .from('pfes')
        .remove([report.file_path]);
      if (pdfError) console.error(`Error deleting PDF ${report.file_path}:`, pdfError);
    }

    // Delete Thumbnail (extract path from URL)
    if (report.thumbnail_url) {
      try {
        const urlParts = report.thumbnail_url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${userId}/${fileName}`;
        
        const { error: thumbError } = await supabase.storage
          .from('thumbnails')
          .remove([filePath]);
        if (thumbError) console.error(`Error deleting thumbnail ${filePath}:`, thumbError);
      } catch (e) {
        console.error('Error parsing thumbnail URL for deletion:', e);
      }
    }
  }

  // 4. Delete reports from database
  const { error: deleteError } = await supabase
    .from('reports')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error deleting reports from DB:', deleteError);
    return { error: deleteError };
  }

  // 5. Reset active_report_id in profile
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ active_report_id: null })
    .eq('id', userId);

  if (profileError) {
    console.error('Error resetting active_report_id:', profileError);
  }

  return { success: true };
}
