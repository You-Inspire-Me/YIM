import { api } from './api';

export const uploadImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', file);

  try {
    const response = await api.post('/host/upload/image', formData, {
      headers: { 
        'Content-Type': 'multipart/form-data'
      },
      timeout: 30000 // 30 second timeout
    });

    if (!response.data?.url) {
      throw new Error('No URL returned from server');
    }

    return response.data.url;
  } catch (error: any) {
    console.error('Upload error details:', {
      message: error?.message,
      response: error?.response?.data,
      status: error?.response?.status,
      config: error?.config
    });
    throw error;
  }
};

