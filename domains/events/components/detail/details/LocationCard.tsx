import { MapPin } from 'lucide-react';
import * as React from 'react';
import { getTheme } from '../../../../../lib/constants';
import {
  LocationAutocomplete,
  type LocationSuggestion,
} from '../../../../../lib/ui/components/LocationAutocomplete';
import { openExternalUrl } from '../../../../../lib/ui/utils/openExternalUrl';
import { useItineraryGeocoding } from '../../../hooks/useItineraryGeocoding';
import type { ItineraryItem, LocationData } from '../../../types';
import { extractUniqueLocations, sortByStartTime } from '../itineraries/itinerary';
import { FullScreenMapModal } from '../maps/FullScreenMapModal';
import { LeafletMiniMapPreview } from '../maps/LeafletMiniMapPreview';
import { buildGoogleMapsLatLngUrl, buildGoogleMapsSearchUrl } from '../maps/maps';
import { SectionCard } from '../SectionCard';
import { buildLocationDisplayKey, formatEventLocationForDisplay } from '../utils/locationDisplay';

type DisplayLocation = { primary: string; secondary?: string };
type ItineraryLocDisplay = { full: string; label: string; isReal: boolean };
type DisplayModeLocation = {
  key: string;
  display: DisplayLocation;
  full: string;
  point?: [number, number];
};

export function LocationCard(props: {
  itineraryItems: ItineraryItem[];
  formatRawLocationForDisplay: (raw: string) => DisplayLocation;
  formatItineraryLocationForDisplay: (location: string | undefined) => ItineraryLocDisplay;
  onOpenItineraryLocationInMaps: (locationFull: string) => void;

  activityType: string;
  title?: string;
  eventLocation: string;
  eventLocationData?: LocationData;
  eventCoordinates?: { lat?: number | null; lng?: number | null } | null;

  isEditMode: boolean;
  locationValue: string;
  onChangeLocationText?: (text: string) => void;
  onSelectLocation?: (selection: LocationSuggestion) => void;
  locationError?: string;
  collapsible?: boolean;
  expanded?: boolean;
  onToggleExpanded?: () => void;
  collapsedActionStyle?: 'plus' | 'chevron';
  isEmptyState?: boolean;
}) {
  const [showMapModal, setShowMapModal] = React.useState(false);
  const themeHex = getTheme(props.activityType).hex;

  const hasItinerary = props.itineraryItems.length > 0;
  const orderedItineraryItems = React.useMemo(
    () => sortByStartTime(props.itineraryItems),
    [props.itineraryItems]
  );
  const uniqueItineraryLocations = React.useMemo(
    () => extractUniqueLocations(orderedItineraryItems),
    [orderedItineraryItems]
  );
  const hasEventCoordinates =
    typeof props.eventCoordinates?.lat === 'number' &&
    typeof props.eventCoordinates?.lng === 'number';
  const eventCoordinates = props.eventCoordinates;

  const { geoByLocation: itineraryGeo, loading: itineraryGeoLoading } = useItineraryGeocoding({
    enabled: hasItinerary,
    uniqueLocations: uniqueItineraryLocations,
    eventLocation: props.eventLocation,
    eventCoordinates:
      (props.eventCoordinates as { lat: number; lng: number } | undefined) || undefined,
  });

  const displayLocation = React.useMemo(() => {
    return formatEventLocationForDisplay({
      raw: props.locationValue,
      locationData: props.eventLocationData,
    });
  }, [props.eventLocationData, props.locationValue]);
  const hasOverallLocation = React.useMemo(
    () => !!String(displayLocation.primary ?? '').trim(),
    [displayLocation.primary]
  );
  const scheduleLocationDisplays = React.useMemo(
    () =>
      uniqueItineraryLocations.map(raw => ({
        raw,
        display: props.formatRawLocationForDisplay(raw),
        itinerary: props.formatItineraryLocationForDisplay(raw),
      })),
    [
      props.formatItineraryLocationForDisplay,
      props.formatRawLocationForDisplay,
      uniqueItineraryLocations,
    ]
  );
  const showScheduleLocations = scheduleLocationDisplays.length > 0;
  const overallLocationDuplicateOfSchedule = React.useMemo(() => {
    if (!hasOverallLocation) return false;
    const overallKey = buildLocationDisplayKey(displayLocation);
    if (!overallKey) return false;
    return scheduleLocationDisplays.some(
      ({ display }) => buildLocationDisplayKey(display) === overallKey
    );
  }, [displayLocation, hasOverallLocation, scheduleLocationDisplays]);
  const showOverallLocation = hasOverallLocation && !overallLocationDuplicateOfSchedule;
  const displayModeLocations = React.useMemo<DisplayModeLocation[]>(() => {
    const locations: DisplayModeLocation[] = [];
    const overallPoint =
      hasEventCoordinates && eventCoordinates
        ? ([eventCoordinates.lat as number, eventCoordinates.lng as number] as [number, number])
        : undefined;

    if (showOverallLocation) {
      locations.push({
        key: `overall:${buildLocationDisplayKey(displayLocation) || 'event'}`,
        display: displayLocation,
        full: String(props.locationValue ?? '').trim(),
        point: overallPoint,
      });
    }

    for (const { raw, display } of scheduleLocationDisplays) {
      const geo = itineraryGeo[raw];
      locations.push({
        key: `schedule:${raw}`,
        display,
        full: raw,
        point: geo ? ([geo.lat, geo.lng] as [number, number]) : undefined,
      });
    }

    return locations;
  }, [
    displayLocation,
    eventCoordinates,
    hasEventCoordinates,
    itineraryGeo,
    props.locationValue,
    scheduleLocationDisplays,
    showOverallLocation,
  ]);
  const miniMapPoints = React.useMemo(() => {
    const points: Array<[number, number]> = [];
    const seen = new Set<string>();
    for (const location of displayModeLocations) {
      if (!location.point) continue;
      const [lat, lng] = location.point;
      const key = `${lat.toFixed(6)},${lng.toFixed(6)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      points.push(location.point);
    }
    return points;
  }, [displayModeLocations]);
  const hasMiniMapPoints = miniMapPoints.length > 0;
  const showCombinedLocationList = !props.isEditMode && displayModeLocations.length > 1;
  const showEditModeCombinedList = props.isEditMode && displayModeLocations.length > 1;

  const openMap = React.useCallback(() => {
    if (!hasMiniMapPoints) return;
    setShowMapModal(true);
  }, [hasMiniMapPoints]);
  const openDisplayModeLocation = React.useCallback((location: DisplayModeLocation) => {
    if (location.point) {
      openExternalUrl(buildGoogleMapsLatLngUrl(location.point[0], location.point[1]));
      return;
    }
    const query =
      location.full ||
      [location.display.primary, location.display.secondary].filter(Boolean).join(', ');
    if (!query) return;
    openExternalUrl(buildGoogleMapsSearchUrl(query));
  }, []);

  const contentVisible = !props.collapsible || props.expanded !== false;

  return (
    <SectionCard
      title="Location"
      collapsible={props.collapsible}
      expanded={props.expanded}
      onToggleExpanded={props.onToggleExpanded}
      collapsedActionStyle={props.collapsedActionStyle}
      isEmptyState={props.isEmptyState}
      surface={props.isEditMode ? 'edit' : 'read'}
    >
      {contentVisible ? (
        <div className="flex items-start gap-3">
          <div className="p-2 bg-slate-800 rounded-lg shrink-0">
            <MapPin className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            {props.isEditMode ? (
              <>
                <div className="min-w-0 flex-1">
                  <LocationAutocomplete
                    value={props.locationValue}
                    onChangeText={text => props.onChangeLocationText?.(text)}
                    onSelect={selection => props.onSelectLocation?.(selection)}
                    placeholder="Location"
                    className={`w-full bg-slate-900 border rounded-lg py-2 px-3 text-white outline-none ${
                      props.locationError
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-700 focus:border-primary'
                    }`}
                  />
                </div>
                {props.locationError ? (
                  <div className="text-xs text-red-400 mt-1">{props.locationError}</div>
                ) : null}
                {showEditModeCombinedList ? (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Locations
                    </div>
                    <DisplayModeLocationList
                      locations={displayModeLocations}
                      onOpenLocation={openDisplayModeLocation}
                    />
                  </div>
                ) : showScheduleLocations ? (
                  <div className="mt-4 pt-4 border-t border-slate-800">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                      Schedule locations
                    </div>
                    <ScheduleLocationList
                      locations={scheduleLocationDisplays}
                      onOpenItineraryLocationInMaps={props.onOpenItineraryLocationInMaps}
                    />
                  </div>
                ) : null}
              </>
            ) : showCombinedLocationList ? (
              <div>
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2">
                  Locations
                </div>
                <DisplayModeLocationList
                  locations={displayModeLocations}
                  onOpenLocation={openDisplayModeLocation}
                />
              </div>
            ) : showOverallLocation ? (
              <LocationSummary location={displayLocation} />
            ) : showScheduleLocations ? (
              <LocationSummary location={scheduleLocationDisplays[0]?.display ?? ''} />
            ) : null}

            {!props.isEditMode && hasMiniMapPoints ? (
              <button
                className="mt-3 text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300 transition-colors"
                type="button"
                onClick={openMap}
              >
                Open map
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {contentVisible ? (
        <LeafletMiniMapPreview
          points={miniMapPoints}
          themeHex={themeHex}
          hasItinerary={showScheduleLocations}
          itineraryGeoLoading={itineraryGeoLoading}
          onOpen={openMap}
        />
      ) : null}

      {showMapModal ? (
        <FullScreenMapModal
          points={miniMapPoints}
          themeHex={themeHex}
          title={props.title || 'Map'}
          onClose={() => setShowMapModal(false)}
        />
      ) : null}
    </SectionCard>
  );
}

function DisplayModeLocationList(props: {
  locations: DisplayModeLocation[];
  onOpenLocation: (location: DisplayModeLocation) => void;
}) {
  return (
    <ol className="space-y-2">
      {props.locations.map((location, idx) => (
        <li key={location.key} className="min-w-0">
          <button
            type="button"
            onClick={() => props.onOpenLocation(location)}
            className="w-full text-left min-w-0 group"
            aria-label="Open location in maps"
          >
            <div className="flex items-start gap-2 min-w-0">
              <div className="text-xs font-bold text-slate-500 mt-[2px] shrink-0">{idx + 1}</div>
              <div className="min-w-0">
                <div className="font-bold text-white truncate group-hover:underline decoration-slate-600 decoration-dashed">
                  {location.display.primary}
                </div>
                {location.display.secondary ? (
                  <div className="text-sm text-slate-400 truncate">
                    {location.display.secondary}
                  </div>
                ) : null}
              </div>
            </div>
          </button>
        </li>
      ))}
    </ol>
  );
}

function ScheduleLocationList(props: {
  locations: Array<{
    raw: string;
    display: DisplayLocation;
    itinerary: ItineraryLocDisplay;
  }>;
  onOpenItineraryLocationInMaps: (locationFull: string) => void;
}) {
  if (props.locations.length === 0) {
    return <div className="text-sm text-slate-500 italic">No schedule locations yet.</div>;
  }

  return (
    <ol className="space-y-2">
      {props.locations.map(({ raw, display, itinerary }, idx) => {
        const { primary, secondary } = display;

        return (
          <li key={`${idx}-${raw}`} className="min-w-0">
            <button
              type="button"
              onClick={() => props.onOpenItineraryLocationInMaps(itinerary.full)}
              className="w-full text-left min-w-0 group"
              aria-label="Open location in maps"
            >
              <div className="flex items-start gap-2 min-w-0">
                <div className="text-xs font-bold text-slate-500 mt-[2px] shrink-0">{idx + 1}</div>
                <div className="min-w-0">
                  <div className="font-bold text-white truncate group-hover:underline decoration-slate-600 decoration-dashed">
                    {primary}
                  </div>
                  {secondary ? (
                    <div className="text-sm text-slate-400 truncate">{secondary}</div>
                  ) : null}
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ol>
  );
}

function LocationSummary(props: { location: DisplayLocation }) {
  return props.location.secondary ? (
    <div className="min-w-0">
      <div className="font-bold text-white truncate">{props.location.primary}</div>
      <div className="text-sm text-slate-400 truncate">{props.location.secondary}</div>
    </div>
  ) : (
    <div className="font-bold text-white">{props.location.primary}</div>
  );
}
