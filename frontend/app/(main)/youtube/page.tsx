import { Navbar } from "@/components/Navbar";
import { YouTubeViewer } from "@/components/YouTubeViewer";

export default function YouTubePage() {
  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gray-50">
      <Navbar />
      <div className="w-full max-w-5xl space-y-8 pt-32 p-8">
        <h1 className="text-3xl font-bold mb-8 text-center text-gray-900">
          Video Browser
        </h1>
        <YouTubeViewer />
      </div>
    </div>
  );
}
