/**
 * Floor Plan Geometry Types
 *
 * Used by TR-004 (GPT-4o Vision) for geometric extraction
 * and GN-011 (Interactive 3D Viewer) for Three.js rendering.
 *
 * Coordinate system: origin at top-left of floor plan
 *   X axis → right (meters)
 *   Y axis → down  (meters)
 * In Three.js these map to: X → x, Y → z, height → y
 */

export interface FloorPlanWall {
  start: [number, number];
  end: [number, number];
  thickness: number;
  type: "exterior" | "interior";
}

export interface FloorPlanDoor {
  position: [number, number];
  width: number;
  wallId: number;
  type: "single" | "double" | "sliding";
}

export interface FloorPlanWindow {
  position: [number, number];
  width: number;
  height: number;
  sillHeight: number;
}

export type FloorPlanRoomType =
  | "living"
  | "bedroom"
  | "kitchen"
  | "dining"
  | "bathroom"
  | "veranda"
  | "hallway"
  | "storage"
  | "office"
  | "other";

export interface FloorPlanRoom {
  name: string;
  center: [number, number];
  width: number;
  depth: number;
  type: FloorPlanRoomType;
}

export interface FloorPlanGeometry {
  footprint: { width: number; depth: number };
  wallHeight: number;
  walls: FloorPlanWall[];
  doors: FloorPlanDoor[];
  windows: FloorPlanWindow[];
  rooms: FloorPlanRoom[];
}
