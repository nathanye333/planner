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
import { dayAfterDate } from "@/lib/timezone";

function hourToTime(hour: number) {
  return `${String(hour).padStart(2, "0")}:00:00`;
}

function minutesToDuration(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:00`;
}

/**
 * Week-only FullCalendar for planner heatmaps. Mirrors CalendarView styling
 * (via shared .fc theme in globals.css) but locked to the planner window.
 *
 * All wall-clock times are rendered in the viewer's profile timezone.
 */
export function PlannerCalendarView({
  events,
  dayStartHour,
  dayEndHour,
  slotMinutes,
  dateStart,
  dateEnd,
  timezone,
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
  timezone: string;
  onEventClick?: (arg: EventClickArg) => void;
  onEventMouseEnter?: (arg: EventHoveringArg) => void;
  onEventMouseLeave?: (arg: EventHoveringArg) => void;
  eventClassNames?:
    | string
    | string[]
    | ((arg: EventContentArg) => string | string[]);
}) {
  const rangeEnd = dayAfterDate(dateEnd, timezone);

  return (
    <div className="planner-calendar">
      <FullCalendar
        plugins={[timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        timeZone={timezone}
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
        validRange={{ start: dateStart, end: rangeEnd }}
        visibleRange={{ start: dateStart, end: rangeEnd }}
        allDaySlot={false}
        stickyHeaderDates
        expandRows
      />
    </div>
  );
}
