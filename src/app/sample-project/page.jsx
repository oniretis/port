"use client";
import "./sample-project.css";
import { useRef, Suspense } from "react";

import Copy from "@/components/Copy/Copy";
import BtnLink from "@/components/BtnLink/BtnLink";

import gsap from "gsap";
import ScrollTrigger from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { portfolio } from "../work/portfolio";

gsap.registerPlugin(ScrollTrigger);

const SampleProjectContent = () => {
  const sampleProjectRef = useRef(null);
  const searchParams = useSearchParams();

  const name = searchParams.get("name");
  const bgColor = searchParams.get("bgColor") || "var(--background)";

  // find current project in portfolio
  const currentProject = portfolio
    .flatMap((year) => year.projects)
    .find((p) => p.name === name);

  const nextProject = currentProject
    ? portfolio
        .flatMap((year) => year.projects)
        .find((p) => p.name === currentProject.nextProject)
    : null;

  useGSAP(
    () => {
      const imagesContainer = sampleProjectRef.current.querySelector(
        ".sp-images-container"
      );
      const progressContainer = sampleProjectRef.current.querySelector(
        ".sp-images-scroll-progress-container"
      );
      const counter = sampleProjectRef.current.querySelector(
        "#sp-images-scroll-counter"
      );

      // 👇 this will grab either <img> or <video> inside the banner
      const bannerMedia = sampleProjectRef.current.querySelector(
        ".sp-banner-img img, .sp-banner-img video"
      );

      const btnLinkWrapper =
        sampleProjectRef.current.querySelector(".sp-link-wrapper");

      // apply the same animation to whichever exists
      if (bannerMedia) {
        gsap.set(bannerMedia, {
          clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
        });

        gsap.to(bannerMedia, {
          clipPath: "polygon(0% 100%, 100% 100%, 100% 0%, 0% 0%)",
          duration: 1,
          delay: 1,
          ease: "power4.out",
        });
      }

      if (btnLinkWrapper) {
        gsap.set(btnLinkWrapper, { y: 30, opacity: 0 });

        ScrollTrigger.create({
          trigger: btnLinkWrapper.closest(".sp-copy-description"),
          start: "top 75%",
          once: true,
          onEnter: () => {
            gsap.to(btnLinkWrapper, {
              y: 0,
              opacity: 1,
              duration: 1,
              delay: 1,
              ease: "power4.out",
            });
          },
        });
      }

      ScrollTrigger.create({
        trigger: imagesContainer,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self) => {
          const progress = Math.round(self.progress * 100);
          counter.textContent = progress;

          const containerHeight = progressContainer.offsetHeight;

          const isMobile = window.innerWidth < 1000;
          const baseDistance = window.innerHeight + containerHeight;
          const mobileMultiplier = isMobile ? 1.25 : 1;
          const moveDistance = baseDistance * mobileMultiplier;

          gsap.to(progressContainer, {
            y: -self.progress * moveDistance,
            duration: 0.1,
            ease: "none",
          });
        },
      });

      gsap.set(progressContainer, {
        position: "fixed",
        top: "100vh",
        left: "1.5rem",
        right: "1.5rem",
        width: "calc(100% - 3rem)",
      });
    },
    { scope: sampleProjectRef }
  );

  return (
    <div
      className="sample-project"
      ref={sampleProjectRef}
      style={{ backgroundColor: bgColor }}
    >
      <section className="sp-hero">
        <Copy delay={0.85}>
          <h1>{name}</h1>
        </Copy>
      </section>

      <section className="sp-banner-img">
        {currentProject?.bannerVideo ? (
          <video
            src={currentProject.bannerVideo}
            autoPlay
            muted
            loop
            playsInline
            className="sp-banner-video"
          />
        ) : (
          <img
            src={currentProject?.bannerImg || "/images/work/work_006.jpeg"}
            alt=""
          />
        )}
      </section>

      <section className="sp-copy">
        <div className="sp-info">
          <div className="sp-col sp-col-lg">
            <div className="sp-tags">
              <Copy>
                <p className="sm caps mono">
                  {currentProject?.tags || "Creative Direction"}
                </p>
              </Copy>
            </div>
          </div>
          <div className="sp-col sp-col-sm">
            <div className="sp-year">
              <Copy delay={0.15}>
                <p className="sm caps mono">{currentProject?.year || "2025"}</p>
              </Copy>
            </div>

            <div className="client">
              <Copy delay={0.3}>
                <p className="sm caps mono">
                  {currentProject?.client || "Self-Initiated"}
                </p>
              </Copy>
            </div>
          </div>
        </div>

        <div className="sp-copy-wrapper">
          <div className="sp-col-lg">
            <div className="sp-copy-title">
              <Copy>
                <h3>{currentProject?.title || "Exploring Motion"}</h3>
              </Copy>
            </div>
          </div>
          <div className="sp-col-sm">
            <div className="sp-copy-description">
              <Copy>
                <p>{currentProject?.description || "Sample description..."}</p>
              </Copy>
              <Copy>
                <p>{currentProject?.more || "Sample description..."}</p>
              </Copy>

              <div className="sp-link">
                <div className="sp-link-wrapper">
                  <BtnLink
                    route={currentProject?.link || "/"}
                    label="Live Demo"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="sp-images">
        <div className="sp-images-scroll-progress-container">
          <h1 id="sp-images-scroll-counter">0</h1>
          <h1>/100</h1>
        </div>
        <div className="sp-images-container">
          {(
            currentProject?.images || [
              "/images/work/work_001.jpeg",
              "/images/work/work_021.jpeg",
              "/images/work/work_003.jpeg",
            ]
          ).map((img, idx) => (
            <div className="sp-img" key={idx}>
              <img src={img} alt="" />
            </div>
          ))}
        </div>
      </section>

      <section className="sp-next-project">
        <div className="sp-next-project-copy">
          <Copy>
            <p className="sm">(More Projects)</p>
          </Copy>
          <div className="sp-next-project-names">
            <Copy>
              {nextProject ? (
                <Link
                  href={`/sample-project?name=${encodeURIComponent(
                    nextProject.name
                  )}&bgColor=${encodeURIComponent(nextProject.bgColor)}`}
                >
                  <h1 style={{ cursor: "pointer" }}>{nextProject.name}</h1>
                </Link>
              ) : (
                <h1>{currentProject?.nextProject || "Hidden Signal"}</h1>
              )}
            </Copy>
          </div>
        </div>
      </section>
    </div>
  );
};

const Page = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SampleProjectContent />
    </Suspense>
  );
};

export default Page;
