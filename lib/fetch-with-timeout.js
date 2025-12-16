/**
 * Fetch with timeout and abort signal
 * @param {string} url - URL to fetch
 * @param {object} options - Fetch options
 * @param {number} timeout - Timeout in milliseconds (default: 30000)
 * @returns {Promise} Fetch response
 */
export async function fetchWithTimeout(url, options = {}, timeout = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Safe data fetching with error handling and timeout
 * @param {string} url - URL to fetch
 * @param {string} token - Auth token
 * @param {object} options - Additional fetch options
 * @returns {Promise} Parsed JSON response
 */
export async function safeFetch(url, token, options = {}) {
  try {
    const response = await fetchWithTimeout(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });

    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }

    if (!response.ok) {
      // Try to get error details from response body
      let errorData = null;
      try {
        errorData = await response.json();
      } catch {
        // Response body is not JSON, ignore
      }
      const error = new Error(`HTTP_ERROR_${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return await response.json();
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('TIMEOUT');
    }
    throw error;
  }
}
