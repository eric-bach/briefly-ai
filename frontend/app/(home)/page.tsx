import Link from "next/link";
import { ArrowRight, Youtube } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white flex flex-col justify-center items-center p-4">
      <div className="max-w-2xl text-center space-y-8">
        <div className="flex justify-center animate-fade-in">
          <div className="p-4 bg-white rounded-2xl shadow-xl border border-gray-100 transform -rotate-6 transition-transform hover:rotate-0 duration-300">
            <Youtube className="w-16 h-16 text-red-600" />
          </div>
        </div>

        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-gray-900 drop-shadow-sm">
            Briefly <span className="text-red-600">AI</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 font-light max-w-lg mx-auto leading-relaxed">
            Turn lengthy YouTube videos into concise, actionable summaries in
            seconds.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-8">
          <Link
            href="/dashboard"
            className="group px-8 py-4 bg-red-600 hover:bg-red-700 text-white text-lg font-semibold rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2 transform hover:-translate-y-1"
          >
            Get Started
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </Link>
          <Link
            href="/dashboard"
            className="px-8 py-4 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 text-lg font-medium rounded-full transition-colors duration-300"
          >
            Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
