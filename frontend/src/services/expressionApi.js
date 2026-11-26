const API_BASE = '/api';

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  const text = await response.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response from server (HTTP ${response.status}).`);
  }

  if (!response.ok) {
    const error = new Error(data?.errorMessage || `Request failed with HTTP ${response.status}`);
    error.stage = data?.errorStage || 'HTTP_ERROR';
    error.position = data?.errorPosition ?? null;
    error.payload = data;
    error.status = response.status;
    throw error;
  }

  return data;
}

export async function checkBackendHealth() {
  return requestJson(`${API_BASE}/health`);
}

export async function fetchVariables() {
  return requestJson(`${API_BASE}/variables`);
}

export async function saveVariable(name, value, overwrite = true) {
  return requestJson(`${API_BASE}/variables`, {
    method: 'POST',
    body: JSON.stringify({ name, value, overwrite }),
  });
}

export async function updateVariable(name, value) {
  return requestJson(`${API_BASE}/variables/${encodeURIComponent(name)}`, {
    method: 'PUT',
    body: JSON.stringify({ name, value, overwrite: true }),
  });
}

export async function deleteVariable(name) {
  return requestJson(`${API_BASE}/variables/${encodeURIComponent(name)}`, {
    method: 'DELETE',
  });
}

export async function validateExpression(expression, variables = null) {
  const body = variables ? { expression, variables } : { expression };
  return requestJson(`${API_BASE}/validate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function evaluateExpression(expression, variables = null) {
  const body = variables ? { expression, variables } : { expression };
  return requestJson(`${API_BASE}/evaluate`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function compareExpressions(expression1, expression2, variables = null) {
  const body = variables
    ? { expression1, expression2, variables }
    : { expression1, expression2 };
  return requestJson(`${API_BASE}/compare`, {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export async function fetchTestCases() {
  return requestJson(`${API_BASE}/test/cases`);
}

export async function runSingleTest(testCase) {
  return requestJson(`${API_BASE}/test`, {
    method: 'POST',
    body: JSON.stringify(testCase),
  });
}

export async function runAllTests() {
  return requestJson(`${API_BASE}/test/run-all`, {
    method: 'POST',
  });
}
