"use client";

import { useState, useCallback, useRef } from "react";
import type { Patio, PatioWithSunStatus } from "@/lib/types";
import { getSunPosition, getSunTag, isSunUp } from "@/lib/suncalc-utils";
import { classifyPatiosShadow } from "@/lib/shadow-calc";
import type { BuildingIndex } from "@/lib/building-index";
import type { WeatherData } from "@/lib/weather-utils";
import { getHourlySunFactor } from "@/lib/weather-utils";

export function usePatioSunStatus(
  patios: Patio[],
  buildingIndex: BuildingIndex | null,
  date: Date,
  weather: WeatherData | null
) {
  const [patiosWithStatus, setPatiosWithStatus] = useState<PatioWithSunStatus[]>([]);
  const [sunCount, setSunCount] = useState(0);
  const [shadeCount, setShadeCount] = useState(0);
  const rafRef = useRef<number | null>(null);

  const classifyPatios = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      if (!buildingIndex || !patios.length) return;

      // Compute cloud sun factor from the slider's current hour
      const hour = date.getHours();
      const cloudSunFactor = getHourlySunFactor(weather?.hourly, hour);

      // Check if sun is up
      if (!isSunUp(date)) {
        const sunTag = getSunTag(false, false, 0, date);
        const classified = patios.map((p) => ({ ...p, inSun: false, sunTag }));
        setSunCount(0);
        setShadeCount(classified.length);
        setPatiosWithStatus(classified);
        return;
      }

      // Get sun position for geometric shadow calc
      const { azimuthDegrees, altitudeDegrees } = getSunPosition(date);

      // Run deterministic shadow classification against spatial index
      const shadowMap = classifyPatiosShadow(
        buildingIndex,
        patios,
        azimuthDegrees,
        altitudeDegrees
      );

      let sun = 0;
      let shade = 0;

      const classified = patios.map((patio) => {
        const status = shadowMap.get(patio.id) ?? { inSun: true, blockedByBuilding: false };

        // Heavy overcast: flip geometrically-sunlit patios to shade
        let effectiveInSun = status.inSun;
        if (cloudSunFactor < 0.2 && effectiveInSun) {
          effectiveInSun = false;
        }

        if (effectiveInSun) sun++;
        else shade++;

        const sunTag = getSunTag(
          effectiveInSun,
          status.blockedByBuilding,
          altitudeDegrees,
          date,
          cloudSunFactor
        );
        return { ...patio, inSun: effectiveInSun, sunTag };
      });

      setSunCount(sun);
      setShadeCount(shade);
      setPatiosWithStatus(classified);
    });
  }, [patios, buildingIndex, date, weather]);

  return {
    patiosWithStatus,
    sunCount,
    shadeCount,
    classifyPatios,
  };
}
