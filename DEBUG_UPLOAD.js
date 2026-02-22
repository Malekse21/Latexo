// Upload Debugging Script
// Run this in your browser console (F12) while on the dashboard page

async function testUpload() {
  console.log('🔍 Starting upload test...');
  
  // Create a dummy PDF file for testing
  const dummyPDF = new Blob(['%PDF-1.4\n%Test PDF'], { type: 'application/pdf' });
  const file = new File([dummyPDF], 'test.pdf', { type: 'application/pdf' });
  
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    console.log('📤 Sending request to /api/upload-test...');
    const response = await fetch('/api/upload-test', {
      method: 'POST',
      body: formData,
    });
    
    console.log('📥 Response status:', response.status);
    
    const data = await response.json();
    console.log('📦 Response data:', data);
    
    if (response.ok) {
      console.log('✅ Test passed!');
    } else {
      console.error('❌ Test failed:', data.error);
    }
    
    return data;
  } catch (error) {
    console.error('❌ Network error:', error);
    return { error: error.message };
  }
}

// Run the test
testUpload();
