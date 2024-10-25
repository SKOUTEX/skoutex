import Image from "next/image";
import { Suspense } from "react";
import { Skeleton } from "~/components/ui/skeleton";
import { Button } from "~/components/ui/button";
import {
  Users,
  Search,
  BarChart2,
  ArrowLeftRight,
  Globe,
  Clock,
  Ruler,
  Calendar,
} from "lucide-react";
import Link from "next/link";

export default function HeroPage() {
  return (
    <section className="w-full bg-background py-12 md:py-24 lg:py-32">
      <div className="container px-4 md:px-6">
        <div className="grid gap-6 lg:grid-cols-[1fr_600px] lg:gap-12 xl:grid-cols-[1fr_700px]">
          <div className="flex flex-col justify-center space-y-8">
            <div className="space-y-4">
              <h1 className="text-3xl font-bold tracking-tighter text-foreground sm:text-4xl md:text-5xl xl:text-[3.4rem] 2xl:text-[3.75rem]">
                Advanced Player Analysis & Scouting Platform
              </h1>
              <p className="max-w-[600px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                Compare players, discover hidden talents, and make data-driven
                decisions with our comprehensive football analysis system. Get
                detailed comparisons and find players matching specific
                criteria.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-start gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <ArrowLeftRight className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Comparative Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Side-by-side player comparisons with technical skills,
                    physical attributes, and detailed conclusions
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Search className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Advanced Player Search</h3>
                  <p className="text-sm text-muted-foreground">
                    Find players by position, stats, playing time, nationality,
                    and market value
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <BarChart2 className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Statistical Deep Dive</h3>
                  <p className="text-sm text-muted-foreground">
                    Comprehensive analysis of technical skills and physical
                    attributes
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <div className="rounded-lg bg-primary/10 p-2">
                  <Globe className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Global Coverage</h3>
                  <p className="text-sm text-muted-foreground">
                    Track players across leagues and analyze international
                    talent
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <div className="flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-sm">
                <Clock className="h-4 w-4" />
                Playing Time Analysis
              </div>
              <div className="flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-sm">
                <Ruler className="h-4 w-4" />
                Physical Attributes
              </div>
              <div className="flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-sm">
                <Calendar className="h-4 w-4" />
                Contract Information
              </div>
              <div className="flex items-center gap-1 rounded-full bg-secondary/80 px-3 py-1 text-sm">
                <Users className="h-4 w-4" />
                Similar Player Finding
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Link href="/analysis">
                <Button size="lg" className="w-full sm:w-auto">
                  Start Player Analysis
                </Button>
              </Link>
              <Link href="/search">
                <Button
                  variant="outline"
                  size="lg"
                  className="w-full sm:w-auto"
                >
                  Search Players
                </Button>
              </Link>
            </div>
          </div>

          <div className="relative flex aspect-square w-full items-center overflow-hidden rounded-xl bg-muted lg:order-last">
            <Suspense fallback={<Skeleton className="h-full w-full" />}>
              <Image
                src="/football-analytics-hero.webp"
                alt="Football Analytics Platform"
                width={700}
                height={700}
                priority
                className="object-cover transition-transform duration-300 hover:scale-105"
              />
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}
