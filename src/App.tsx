import React, { useEffect } from 'react';
import {
  Panel,
  PanelGroup,
  PanelResizeHandle,
} from "react-resizable-panels";
import { ChatSidebar } from './components/ChatSidebar';
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { EditorLayout } from './components/EditorLayout';
import { FileTreeContainer } from './components/FileTreeContainer';
import { useContextKeys } from './commands/contextKeys';
import { Toaster } from 'sonner';
import './App.css';
import { useEditorStore } from './store/editorStore';

const App: React.FC = () => {
  // const [showInitDialog, setShowInitDialog] = useState(true);

  const { isChatVisible, setIsChatVisible } = useEditorStore()
  const setContext = useContextKeys(state => state.setContext);


  // Initialize contexts
  useEffect(() => {
    // Set up initial contexts
    setContext('inZenMode', false);
    setContext('editorFocus', true);
    setContext('terminalFocus', false);
    setContext('chatFocus', false);
    // setContext('chatVisible', isChatVisible);
  }, [setContext]);



  useEffect(() => {
    const checkDetachedWindow = async () => {
      const chatWindow = await WebviewWindow.getByLabel("chat");
      if (chatWindow) {
        setIsChatVisible(false);
      }
    };
    checkDetachedWindow();
  }, []);

  const handleDetach = async () => {
    setIsChatVisible(false);

    const chatWindow = new WebviewWindow("chat", {
      url: "chat.html",
      title: "Chat",
      width: 400,
      height: 600,
    });

    const unlisten = await chatWindow.onCloseRequested(async () => {
      setIsChatVisible(true);
      unlisten();
    });

    chatWindow.once("tauri://error", (e) => {
      console.error("Failed to create chat window:", e);
      setIsChatVisible(true);
    });
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-background">
      <Toaster richColors position="top-right" />
      {/* <ProjectInitDialog
        open={showInitDialog}
        onOpenChange={setShowInitDialog}
      /> */}
      {/* Main Content */}
      <PanelGroup direction="horizontal" autoSaveId="app-layout">
        <>
          <Panel id="filetree" defaultSize={15} minSize={10} maxSize={30}>
            <div className="h-full border-r border-border/40">
              <FileTreeContainer />
            </div>
          </Panel>
          <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
        </>

        {/* Editor */}
        <Panel
          id="editor"
          defaultSize={85}
          minSize={40}
        >
          <EditorLayout />
        </Panel>

        {/* Chat */}
        {isChatVisible && (
          <>
            <PanelResizeHandle className="w-1.5 bg-border/40 hover:bg-border/60 transition-colors" />
            <Panel
              id="chat"
              defaultSize={20}
              minSize={15}
              maxSize={40}
              order={2}
            >
              <div className="h-full border-l border-border/40">
                <ChatSidebar onDetach={handleDetach} />
              </div>
            </Panel>
          </>
        )}
      </PanelGroup>
    </div>
  );
};

export default App;
