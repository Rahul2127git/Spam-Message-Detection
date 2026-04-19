import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";

export default function Navigation() {
  const { theme, toggleTheme } = useTheme();

  return (
    <nav className="sticky top-0 z-50 bg-background border-b border-border">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <a className="flex items-center gap-2 font-bold text-xl hover:opacity-80 transition-opacity">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm font-bold">S</span>
            </div>
            <span className="hidden sm:inline">SpamShield AI</span>
          </a>
        </Link>

        {/* Navigation Links */}
        <div className="flex items-center gap-1 sm:gap-2">
          <Link href="/">
            <a className="inline-block">
              <Button variant="ghost" className="text-sm">
                Home
              </Button>
            </a>
          </Link>
          <Link href="/detector">
            <a className="inline-block">
              <Button variant="ghost" className="text-sm">
                Detector
              </Button>
            </a>
          </Link>
          <Link href="/dashboard">
            <a className="inline-block">
              <Button variant="ghost" className="text-sm">
                Dashboard
              </Button>
            </a>
          </Link>
          <Link href="/about">
            <a className="inline-block">
              <Button variant="ghost" className="text-sm">
                About
              </Button>
            </a>
          </Link>

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="ml-2"
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </Button>
        </div>
      </div>
    </nav>
  );
}
