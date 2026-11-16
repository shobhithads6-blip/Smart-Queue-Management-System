package com.qms.controller;

import com.qms.model.dto.response.CounterBoardState;
import com.qms.model.dto.response.TicketResponse;
import com.qms.model.entity.Counter;
import com.qms.service.CounterService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/counters")
@RequiredArgsConstructor
@Tag(name = "Staff / Counter")
public class CounterController {

    private final CounterService counterService;

    @GetMapping
    @Operation(summary = "List all counters with their current status")
    public ResponseEntity<List<Counter>> getCounters() {
        return ResponseEntity.ok(counterService.getAllCounters());
    }

    @GetMapping("/{id}/current")
    @Operation(summary = "Get the currently called ticket for a counter")
    public ResponseEntity<TicketResponse> getCurrentTicket(@PathVariable Long id) {
        TicketResponse ticket = counterService.getCurrentTicket(id);
        return ticket == null ? ResponseEntity.noContent().build() : ResponseEntity.ok(ticket);
    }

    @GetMapping("/board")
    @Operation(summary = "Get counters and any currently called tickets for the public display board")
    public ResponseEntity<List<CounterBoardState>> getBoardState() {
        return ResponseEntity.ok(counterService.getBoardState());
    }

    @PostMapping("/{id}/next")
    @Operation(summary = "Call the next ticket in queue for this counter")
    public ResponseEntity<TicketResponse> callNext(@PathVariable Long id) {
        return ResponseEntity.ok(counterService.callNext(id));
    }

    @PutMapping("/{id}/complete")
    @Operation(summary = "Mark the current ticket as completed")
    public ResponseEntity<TicketResponse> complete(@PathVariable Long id) {
        return ResponseEntity.ok(counterService.markCompleted(id));
    }

    @PutMapping("/{id}/no-show")
    @Operation(summary = "Mark the current ticket as no-show and clear the counter")
    public ResponseEntity<TicketResponse> noShow(@PathVariable Long id) {
        return ResponseEntity.ok(counterService.markNoShow(id));
    }

    @PutMapping("/{id}/transfer")
    @Operation(summary = "Transfer the current customer to a different service type queue")
    public ResponseEntity<TicketResponse> transfer(@PathVariable Long id,
                                                    @RequestParam Long targetServiceTypeId) {
        return ResponseEntity.ok(counterService.transferTicket(id, targetServiceTypeId));
    }
}
