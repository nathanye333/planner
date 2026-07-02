"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  DateSelectArg,
  EventClickArg,
  EventInput,
} from "@fullcalendar/core";
import { utcIsoForFullCalendar } from "@/lib/timezone";

function calendarEvents(events: EventInput[], timezone?: string): EventInput[] {
  if (!timezone || timezone === "UTC") return events;
  return events.map((event) => ({
    ...event,
    start: event.start
      ? utcIsoForFullCalendar(String(event.start), timezone)
      : event.start,
    end: event.end
      ? utcIsoForFullCalendar(String(event.end), timezone)
      : event.end,
  }));
}

/**
 * Thin FullCalendar wrapper providing month / week / agenda views with the
 * Gather theme. Used read-only (overlays) and interactively (availability
 * editor) depending on which handlers are passed.
 */
export function CalendarView({
  events,
  initialView = "timeGridWeek",
  selectable = false,
  onSelect,
  onEventClick,
  height = "auto",
  timeZone,
  headerToolbarRight = "dayGridMonth,timeGridWeek,listWeek",
}: {
  events: EventInput[];
  initialView?: "dayGridMonth" | "timeGridWeek" | "listWeek";
  selectable?: boolean;
  onSelect?: (arg: DateSelectArg) => void;
  onEventClick?: (arg: EventClickArg) => void;
  height?: number | "auto";
  timeZone?: string;
  headerToolbarRight?: string;
}) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
      initialView={initialView}
      timeZone={timeZone}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: headerToolbarRight,
      }}
      buttonText={{
        today: "Today",
        month: "Month",
        week: "Week",
        list: "Agenda",
      }}
      events={calendarEvents(events, timeZone)}
      selectable={selectable}
      selectMirror={selectable}
      select={onSelect}
      eventClick={onEventClick}
      nowIndicator
      height={height}
      slotMinTime="06:00:00"
      slotMaxTime="24:00:00"
      allDaySlot={false}
      stickyHeaderDates
      expandRows
    />
  );
}
