import { describe, expect, it } from 'vitest';
import { generateCurl } from './curl';
import { generateFetch } from './fetch';
import { generateAxios } from './axios';
import { generatePythonRequests } from './pythonRequests';
import { generateGoNetHttp } from './goNetHttp';
import { generateNodeHttp } from './nodeHttp';
import { generatePhpCurl } from './phpCurl';
import { generateRubyNetHttp } from './rubyNetHttp';
import { generateJavaOkHttp } from './javaOkHttp';
import { generateCsharpHttpClient } from './csharpHttpClient';
import { generateSwiftUrlSession } from './swiftUrlSession';
import { generateDartHttp } from './dartHttp';
import type { ApiRequest } from '../../types/api';

const request: ApiRequest = {
  id: 'req',
  name: 'Example',
  method: 'POST',
  url: 'https://api.example.com',
  headers: [{ id: 'h', key: 'Content-Type', value: 'application/json', enabled: true }],
  params: [],
  auth: { type: 'none' },
  body: { mode: 'json', json: JSON.stringify({ hello: 'world' }) },
  scripts: { preRequest: '', test: '' },
  tags: [],
  examples: []
};

describe('codegen snippets', () => {
  it('generates curl command', () => {
    const snippet = generateCurl(request, request.url);
    expect(snippet).toContain("curl -X POST");
    expect(snippet).toContain("Content-Type");
  });

  it('generates fetch snippet', () => {
    const snippet = generateFetch(request, request.url);
    expect(snippet).toContain('await fetch');
  });

  it('generates axios snippet', () => {
    const snippet = generateAxios(request, request.url);
    expect(snippet).toContain('axios.create');
  });

  it('generates python snippet', () => {
    const snippet = generatePythonRequests(request, request.url);
    expect(snippet).toContain('requests.request');
  });

  it('generates go snippet', () => {
    const snippet = generateGoNetHttp(request, request.url);
    expect(snippet).toContain('http.NewRequest');
  });

  it('generates node http snippet', () => {
    const snippet = generateNodeHttp(request, request.url);
    expect(snippet).toContain('https.request');
  });

  it('generates php curl snippet', () => {
    const snippet = generatePhpCurl(request, request.url);
    expect(snippet).toContain('curl_init');
  });

  it('generates ruby net/http snippet', () => {
    const snippet = generateRubyNetHttp(request, request.url);
    expect(snippet).toContain('Net::HTTP');
  });

  it('generates java okhttp snippet', () => {
    const snippet = generateJavaOkHttp(request, request.url);
    expect(snippet).toContain('OkHttpClient');
  });

  it('generates csharp httpclient snippet', () => {
    const snippet = generateCsharpHttpClient(request, request.url);
    expect(snippet).toContain('HttpClient');
  });

  it('generates swift urlsession snippet', () => {
    const snippet = generateSwiftUrlSession(request, request.url);
    expect(snippet).toContain('URLSession');
  });

  it('generates dart http snippet', () => {
    const snippet = generateDartHttp(request, request.url);
    expect(snippet).toContain('http.Client');
  });
});
