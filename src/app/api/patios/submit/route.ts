import { NextRequest, NextResponse } from "next/server";
import { saveSubmission } from "@/lib/user-submissions";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

// Chicago bounds for validation
const CHI_LAT_MIN = 41.64;
const CHI_LAT_MAX = 42.03;
const CHI_LNG_MIN = -87.94;
const CHI_LNG_MAX = -87.52;

const VALID_TYPES = ["bar", "restaurant", "pub", "rooftop"] as const;

function stripHtml(str: string): string {
  return str.replace(/<[^>]*>/g, "");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { name, address } = body;
    const { lat, lng, type } = body;

    if (!name || typeof name !== "string" || name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
    }

    if (!address || typeof address !== "string") {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    // Sanitize inputs
    name = stripHtml(name).slice(0, 100);
    address = stripHtml(address).slice(0, 200);

    if (name.trim().length < 2) {
      return NextResponse.json({ error: "Name is required (min 2 chars)" }, { status: 400 });
    }

    if (!type || !VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: `Type must be one of: ${VALID_TYPES.join(", ")}` },
        { status: 400 }
      );
    }

    let finalLat = lat ? parseFloat(lat) : NaN;
    let finalLng = lng ? parseFloat(lng) : NaN;

    // Geocode if lat/lng not provided
    if (isNaN(finalLat) || isNaN(finalLng)) {
      if (!MAPBOX_TOKEN) {
        return NextResponse.json(
          { error: "Coordinates required (geocoding unavailable)" },
          { status: 400 }
        );
      }

      const geocodeUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        address + ", Chicago, IL"
      )}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

      const geoRes = await fetch(geocodeUrl);
      if (!geoRes.ok) {
        return NextResponse.json({ error: "Geocoding failed" }, { status: 500 });
      }

      const geoData = await geoRes.json();
      const coords = geoData.features?.[0]?.center;
      if (!coords) {
        return NextResponse.json(
          { error: "Could not geocode address" },
          { status: 400 }
        );
      }

      finalLng = coords[0];
      finalLat = coords[1];
    }

    // Validate Chicago bounds
    if (
      finalLat < CHI_LAT_MIN ||
      finalLat > CHI_LAT_MAX ||
      finalLng < CHI_LNG_MIN ||
      finalLng > CHI_LNG_MAX
    ) {
      return NextResponse.json(
        { error: "Location must be within Chicago" },
        { status: 400 }
      );
    }

    const saved = saveSubmission({
      name: name.trim(),
      address: address.trim(),
      lat: finalLat,
      lng: finalLng,
      type,
      submittedAt: new Date().toISOString(),
    });

    if (!saved) {
      return NextResponse.json(
        { error: "Submissions limit reached" },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true, lat: finalLat, lng: finalLng });
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }
}
