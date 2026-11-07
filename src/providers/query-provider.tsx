"use client";

import React, { ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "react-query";

type Props = {
  children: ReactNode;
};

const QueryProvider = (props: Props) => {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
            // Avoid long blank loading periods when an upstream catalog is unavailable.
            retry: 1,
            retryDelay: 800,
            staleTime: 1000 * 60 * 5,
            cacheTime: 1000 * 60 * 15,
            keepPreviousData: true,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {props.children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
