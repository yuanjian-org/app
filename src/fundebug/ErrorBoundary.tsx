import { Component, ErrorInfo, ReactNode } from "react";
import { Box, VStack, Heading, Text, Button } from "@chakra-ui/react";
import fundebug, { isFundebugEnabled } from "fundebug";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (!isFundebugEnabled()) return;
    fundebug.notifyError(error, { metaData: { info: errorInfo } });
  }

  render() {
    return this.state.hasError ? <ErrorFallback /> : this.props.children;
  }
}

function ErrorFallback() {
  return (
    <Box
      textAlign="center"
      minH="50vh"
      display="flex"
      alignItems="center"
      justifyContent="center"
    >
      <VStack spacing={6}>
        <Heading size="md">出现错误</Heading>
        <Text>抱歉，发生了意外错误。请尝试刷新页面。</Text>
        <Button onClick={() => window.location.reload()} variant="brand">
          刷新页面
        </Button>
      </VStack>
    </Box>
  );
}

export default ErrorBoundary;
