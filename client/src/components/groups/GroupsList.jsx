import React from 'react';

// Funzione helper per formattare la data in modo "smart"
const formatTime = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    
    const isToday = date.getDate() === today.getDate() && 
                    date.getMonth() === today.getMonth() && 
                    date.getFullYear() === today.getFullYear();

    if (isToday) {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' });
};

const GroupsList = ({ groups, onSelectGroup }) => (
  <div className="list-group list-group-flush w-100">
    {groups.map((g) => (
      <div 
        key={g.id} 
        className="list-group-item list-group-item-action d-flex align-items-center p-3 border-bottom border-0"
        style={{ cursor: 'pointer' }}
        onClick={() => onSelectGroup?.(g)}
      >
        
        <div 
          className="d-flex justify-content-center align-items-center bg-light text-dark rounded-circle me-3 flex-shrink-0"
          style={{ width: '48px', height: '48px' }}
        >
          <i className={`bi ${g.is_group ? 'bi-people-fill' : 'bi-person-fill'} fs-5`}></i>
        </div>

        <div className="flex-grow-1 overflow-hidden">
          {/* Riga 1: Nome chat e ora a destra */}
          <div className="d-flex justify-content-between align-items-baseline mb-1">
            <h6 className="mb-0 fw-semibold text-truncate pe-2">
              {g.name}
            </h6>
            {g.last_message && (
              <small className="text-muted flex-shrink-0" style={{ fontSize: '0.75rem' }}>
                {formatTime(g.last_message.sent_at)}
              </small>
            )}
          </div>

          {/* Riga 2: Mittente (se gruppo) e testo */}
          <p className="mb-0 text-muted small text-truncate">
            {g.last_message ? (
              <>
                {/* Se è un gruppo, mostra il nome di chi ha scritto */}
                {g.is_group && (
                  <span className="fw-medium text-dark me-1">
                    {g.last_message.sender_name}:
                  </span>
                )}
                {g.last_message.content}
              </>
            ) : (
              <span className="fst-italic">Nessun messaggio</span>
            )}
          </p>
        </div>

      </div>
    ))}
  </div>
);

export default GroupsList;