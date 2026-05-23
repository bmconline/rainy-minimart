// API Configuration - Auto-detect environment
const getApiUrl = () => {
  if (typeof window !== 'undefined' && window.location) {
    const host = window.location.hostname;
    const protocol = window.location.protocol;
    if (host === 'localhost' || host === '127.0.0.1') {
      return 'http://localhost:3001/api';
    }
    // Production: assume backend is on same domain or use explicit URL
    return `${protocol}//${host}:3001/api`;
  }
  return 'http://localhost:3001/api';
};

window.API_BASE_URL = getApiUrl();

// Helper functions for API calls
window.apiCall = async (method, endpoint, data = null) => {
  try {
    const url = `${window.API_BASE_URL}${endpoint}`;
    const options = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    };
    if (data) options.body = JSON.stringify(data);

    const response = await fetch(url, options);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('API call failed:', error);
    throw error;
  }
};

window.fetchTransactions = async (filters = {}) => {
  const params = new URLSearchParams();
  if (filters.type) params.append('type', filters.type);
  if (filters.category) params.append('category', filters.category);
  if (filters.from) params.append('from', filters.from);
  if (filters.to) params.append('to', filters.to);
  if (filters.search) params.append('search', filters.search);

  const query = params.toString() ? `?${params.toString()}` : '';
  return await window.apiCall('GET', `/transactions${query}`);
};

window.createTransaction = (tx) => window.apiCall('POST', '/transactions', tx);
window.deleteTransaction = (id) => window.apiCall('DELETE', `/transactions/${id}`);
window.updateTransaction = (id, data) => window.apiCall('PUT', `/transactions/${id}`, data);
window.getSummary = () => window.apiCall('GET', '/summary');
