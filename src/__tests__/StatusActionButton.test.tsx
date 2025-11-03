import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import StatusActionButton from '../components/Common/StatusActionButton';

// Mock React useEffect
vi.mock('react', async () => {
  const actual = await vi.importActual<typeof import('react')>();
  return {
    ...actual,
    useEffect: vi.fn((fn, deps) => {
      // Simulate useEffect running on mount and when deps change
      if (deps && deps.length > 0) {
        fn();
      }
    })
  };
});

describe('StatusActionButton Auto-Start Functionality', () => {
  let mockOnAction: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOnAction = vi.fn();
    vi.clearAllMocks();
  });

  describe('when status is "reception_approved" and user is technician', () => {
    it('should automatically trigger start_work action', () => {
      render(
        <StatusActionButton
          appointmentId="test-appointment-id"
          currentStatus="reception_approved"
          userRole="technician"
          onAction={mockOnAction}
          disabled={false}
        />
      );

      // Check that useEffect was called
      expect(mockUseEffect).toHaveBeenCalled();

      // Check that start_work action was triggered automatically
      expect(mockOnAction).toHaveBeenCalledWith('start_work', 'test-appointment-id');
    });

    it('should not show start_work button since it\'s auto-triggered', () => {
      render(
        <StatusActionButton
          appointmentId="test-appointment-id"
          currentStatus="reception_approved"
          userRole="technician"
          onAction={mockOnAction}
          disabled={false}
        />
      );

      // Should not show "Bắt đầu làm việc" button
      expect(screen.queryByText('Bắt đầu làm việc')).not.toBeInTheDocument();

      // Should still show other buttons (like view_reception)
      expect(screen.getByText('Xem phiếu tiếp nhận')).toBeInTheDocument();
    });

    it('should not auto-trigger when disabled', () => {
      render(
        <StatusActionButton
          appointmentId="test-appointment-id"
          currentStatus="reception_approved"
          userRole="technician"
          onAction={mockOnAction}
          disabled={true}
        />
      );

      // Should not trigger start_work when disabled
      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('when status is not "reception_approved"', () => {
    it('should not auto-trigger start_work action', () => {
      render(
        <StatusActionButton
          appointmentId="test-appointment-id"
          currentStatus="in_progress"
          userRole="technician"
          onAction={mockOnAction}
          disabled={false}
        />
      );

      // Should not auto-trigger for other statuses
      expect(mockOnAction).not.toHaveBeenCalled();

      // Should show normal buttons
      expect(screen.getByText('Hoàn thành')).toBeInTheDocument();
    });
  });

  describe('when user is not technician', () => {
    it('should not auto-trigger start_work action', () => {
      render(
        <StatusActionButton
          appointmentId="test-appointment-id"
          currentStatus="reception_approved"
          userRole="staff"
          onAction={mockOnAction}
          disabled={false}
        />
      );

      // Should not auto-trigger for non-technician users
      expect(mockOnAction).not.toHaveBeenCalled();
    });
  });

  describe('button functionality', () => {
    it('should call onAction when other buttons are clicked', () => {
      render(
        <StatusActionButton
          appointmentId="test-appointment-id"
          currentStatus="pending"
          userRole="staff"
          onAction={mockOnAction}
          disabled={false}
        />
      );

      // Click confirm button
      const confirmButton = screen.getByText('Xác nhận lịch hẹn');
      fireEvent.click(confirmButton);

      expect(mockOnAction).toHaveBeenCalledWith('confirm_appointment', 'test-appointment-id');
    });
  });
});