import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

type AuthData = {
  email: string;
  password: string;
  userId?: string;
};

type RequestResult = {
  ok: true;
  user?: SelectUser;
  message?: string;
} | {
  ok: false;
  message: string;
  code?: 'MISSING_CREDENTIALS' | 'INVALID_EMAIL_FORMAT' | 'INVALID_PASSWORD' | 'ACCOUNT_DEACTIVATED' | 'SYSTEM_ERROR';
};

type ApiError = {
  message: string;
  code?: string;
};

async function handleRequest(
  url: string,
  method: string,
  body?: AuthData
): Promise<RequestResult> {
  try {
    const response = await fetch(url, {
      method,
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      return { 
        ok: false, 
        message: data?.message || response.statusText || 'An error occurred' 
      };
    }

    return { 
      ok: true, 
      user: data?.user,
      message: data?.message 
    };
  } catch (e: any) {
    console.error('Auth request error:', e);
    return { 
      ok: false, 
      message: e.toString() 
    };
  }
}

async function fetchUser(): Promise<SelectUser | null> {
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }

    let errorData: ApiError;

    try {
      errorData = await response.json();
    } catch {
      // If response is not JSON, use text
      const message = await response.text();
      errorData = { 
        message: message || response.statusText,
        code: 'SYSTEM_ERROR'
      };
    }

    if (response.status >= 500) {
      return { 
        ok: false, 
        message: "A system error occurred. Please try again later.",
        code: 'SYSTEM_ERROR'
      };
    }

    return { 
      ok: false, 
      message: errorData.message,
      code: errorData.code as RequestResult['code']
    };
  }

  return response.json();
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false
  });

  const loginMutation = useMutation<RequestResult, Error, AuthData>({
    mutationFn: (userData) => handleRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
      }
    },
  });

  const registerMutation = useMutation<RequestResult, Error, AuthData>({
    mutationFn: (userData) => handleRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      if (data.ok && data.user) {
        queryClient.setQueryData(['user'], data.user);
      }
    },
  });

  const logoutMutation = useMutation<RequestResult, Error>({
    mutationFn: () => handleRequest('/api/logout', 'POST'),
    onSuccess: () => {
      queryClient.setQueryData(['user'], null);
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
  };
}