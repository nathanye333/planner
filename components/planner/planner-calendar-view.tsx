"use client";

import FullCalendar from "@fullcalendar/react";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import type {
  EventClickArg,
  EventContentArg,
  EventHoveringArg,
  EventInput,
} from "@fullcalendar/core";

function hourToTime(hour: number) {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

function minutesToDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

function dayAfter(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  const next = new Date(y, m - 1, d + 1);
  return [
    next.getFullYear(),
    String(next.getMonth() + 1).padStart(2, "0"),
    String(next.getDate()).padStart(2, "0"),
  ].join("-");
}

/**
 * Week-only FullCalendar for planner heatmaps. Mirrors CalendarView styling
 * (via shared .fc theme in globals.css) but locked to the planner window.
 *
 * Planner rendering intentionally follows local-time behavior used by the
 * rest of the calendar surfaces in the app.
 */
export function PlannerCalendarView({
  events,
  dayStartHour,
  dayEndHour,
  slotMinutes,
  dateStart,
  dateEnd,
  onEventClick,
  onEventMouseEnter,
  onEventMouseLeave,
  eventClassNames,
}: {
  events: EventInput[];
  dayStartHour: number;
  dayEndHour: number;
  slotMinutes: number;
  dateStart: string;
  dateEnd: string;
  onEventClick?: (arg: EventClickArg) => void;
  onEventMouseEnter?: (arg: EventHoveringArg) => void;
  onEventMouseLeave?: (arg: EventHoveringArg) => void;
  eventClassNames?:
    | string
    | string[]
    | ((arg: EventContentArg) => string | string[]);
}) {
  return (
    <div className="planner-calendar">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: "prev,next today",
          center: "title",
          right: "",
        }}
        buttonText={{ today: "Today" }}
        events={events}
        eventClick={onEventClick}
        eventMouseEnter={onEventMouseEnter}
        eventMouseLeave={onEventMouseLeave}
        eventClassNames={eventClassNames}
        eventDidMount={(info) => {
          const color = info.event.extendedProps.heatmapColor as
            | string
            | undefined;
          if (!color) return;
          info.el.style.backgroundColor = color;
          info.el.style.opacity = "1";
        }}
        nowIndicator
        height="auto"
        slotMinTime={hourToTime(dayStartHour)}
        slotMaxTime={hourToTime(dayEndHour)}
        slotDuration={minutesToDuration(slotMinutes)}
        initialDate={dateStart}
        validRange={{ start: dateStart, end: dayAfter(dateEnd) }}
        visibleRange={{ start: dateStart, end: dayAfter(dateEnd) }}
        allDaySlot={false}
        stickyHeaderDates
        expandRows
      />
    </div>
  );
}
