import { describe, it, expect } from '@jest/globals';

describe('Health Check API', () => {
  it('should return status ok', async () => {
    const response = await fetch('https://farmafrancis.up.railway.app/api/health');
    const data = await response.json() as any;
    
    expect(response.status).toBe(200);
    expect(data.status).toBe('ok');
    expect(data.timestamp).toBeDefined();
  });
});
