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
}: {
  events: EventInput[];
  initialView?: "dayGridMonth" | "timeGridWeek" | "listWeek";
  selectable?: boolean;
  onSelect?: (arg: DateSelectArg) => void;
  onEventClick?: (arg: EventClickArg) => void;
  height?: number | "auto";
}) {
  return (
    <FullCalendar
      plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
      initialView={initialView}
      headerToolbar={{
        left: "prev,next today",
        center: "title",
        right: "dayGridMonth,timeGridWeek,listWeek",
      }}
      buttonText={{
        today: "Today",
        month: "Month",
        week: "Week",
        list: "Agenda",
      }}
      events={events}
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
