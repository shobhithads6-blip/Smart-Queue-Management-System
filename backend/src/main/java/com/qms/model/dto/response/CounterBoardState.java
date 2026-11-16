package com.qms.model.dto.response;

import com.qms.model.enums.CounterStatus;
import java.time.LocalDateTime;

public record CounterBoardState(
        Long id,
        String name,
        CounterStatus status,
        String currentToken,
        String currentService,
        LocalDateTime calledAt
) {
}
