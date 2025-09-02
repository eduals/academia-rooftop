{# Módulo de Atividades com HubDB - Portal do Franqueado Rooftop #}
{% set table_id = 125931068 %}
{% set negocio_id = request.query_dict.negocio_id %}

{% if negocio_id %}
  {% set activities_query = 'deal_id=' + negocio_id|urlencode %}
  {% set all_activities = hubdb_table_rows(table_id, activities_query) %}
  
  {# Separar atividades por status e data #}
  {% set future_activities = [] %}
  {% set past_activities = [] %}
  {% set today_timestamp = unixtimestamp() %}
  
  {% for activity in all_activities %}
    {% set activity_timestamp = activity.due_date|datetimeformat('%s')|int %}
    {% if activity.status == "pending" and activity_timestamp >= today_timestamp %}
      {% set future_activities = future_activities + [activity] %}
    {% else %}
      {% set past_activities = past_activities + [activity] %}
    {% endif %}
  {% endfor %}
  
  {# Ordenar atividades #}
  {% set future_activities = future_activities|sort(false, false, 'due_date') %}
  {% set past_activities = past_activities|sort(true, false, 'created_date') %}
{% endif %}

<div class="mx-auto max-w-7xl px-4 py-6 atividades-module" data-module="atividadesHubDB" data-table-id="{{ table_id }}" data-negocio-id="{{ negocio_id }}">
  
  <!-- Loading State -->
  <div class="atividades-loading" style="display: none;">
    <div class="space-y-6">
      <!-- Skeleton das Abas -->
      <div class="bg-white rounded-lg shadow border border-gray-200 p-4">
        <div class="flex gap-4 border-b border-gray-200">
          <div class="h-10 w-40 bg-gray-200 rounded animate-pulse"></div>
          <div class="h-10 w-32 bg-gray-200 rounded animate-pulse"></div>
        </div>
      </div>
      
      <!-- Skeleton das Atividades -->
      <div class="space-y-4">
        {% for i in range(3) %}
        <div class="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div class="flex gap-4">
            <div class="h-12 w-12 bg-gray-200 rounded-full animate-pulse flex-shrink-0"></div>
            <div class="flex-1 space-y-3">
              <div class="h-6 w-3/4 bg-gray-200 rounded animate-pulse"></div>
              <div class="h-4 w-full bg-gray-200 rounded animate-pulse"></div>
              <div class="flex gap-4">
                <div class="h-4 w-32 bg-gray-200 rounded animate-pulse"></div>
                <div class="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
              </div>
            </div>
            <div class="flex gap-2">
              <div class="h-9 w-24 bg-gray-200 rounded animate-pulse"></div>
              <div class="h-9 w-20 bg-gray-200 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
        {% endfor %}
      </div>
    </div>
  </div>

  <!-- Content -->
  <div class="atividades-content">
    <div class="space-y-6">
      
      <!-- Header com botão de nova atividade -->
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-semibold text-gray-900">Atividades</h2>
        <button onclick="window.atividadesModule.showNewActivityModal()" class="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
          <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Nova Atividade
        </button>
      </div>

      <!-- Abas -->
      <div class="bg-white rounded-lg shadow border border-gray-200">
        <div class="border-b border-gray-200">
          <nav class="-mb-px flex">
            <button onclick="window.atividadesModule.switchTab('future')" class="tab-button active flex-1 border-b-2 border-transparent px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none" data-tab="future">
              Próximas Atividades
              <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ future_activities|length }}</span>
            </button>
            <button onclick="window.atividadesModule.switchTab('past')" class="tab-button flex-1 border-b-2 border-transparent px-6 py-3 text-sm font-medium text-gray-500 hover:text-gray-700 hover:border-gray-300 focus:outline-none" data-tab="past">
              Histórico
              <span class="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">{{ past_activities|length }}</span>
            </button>
          </nav>
        </div>

        <!-- Conteúdo das Abas -->
        <div class="p-6">
          
          <!-- Atividades Futuras -->
          <div class="tab-content" data-tab-content="future">
            <!-- Conteúdo será renderizado pelo JavaScript -->
            <div class="future-activities-content">
              {% if future_activities|length > 0 %}
                <div class="space-y-4">
                  {% for activity in future_activities %}
                  <div class="activity-card rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow" data-row-id="{{ activity.hs_row_id }}" data-activity-type="{{ activity.activity_type }}">
                    <div class="flex items-start gap-4">
                      <!-- Ícone do tipo de atividade -->
                      <div class="flex-shrink-0">
                        <div class="activity-icon h-10 w-10 rounded-full flex items-center justify-center
                          {% if activity.activity_type == 'task' %}bg-blue-100 text-blue-600
                          {% elif activity.activity_type == 'meeting' %}bg-purple-100 text-purple-600
                          {% elif activity.activity_type == 'call' %}bg-green-100 text-green-600
                          {% elif activity.activity_type == 'note' %}bg-yellow-100 text-yellow-600
                          {% endif %}">
                          {% if activity.activity_type == 'task' %}
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"></path></svg>
                          {% elif activity.activity_type == 'meeting' %}
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                          {% elif activity.activity_type == 'call' %}
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                          {% elif activity.activity_type == 'note' %}
                            <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                          {% endif %}
                        </div>
                      </div>
                      
                      <!-- Conteúdo da atividade -->
                      <div class="flex-1">
                        <div class="flex items-start justify-between">
                          <div>
                            <h4 class="text-base font-medium text-gray-900">{{ activity.title }}</h4>
                            {% if activity.description %}
                              <p class="mt-1 text-sm text-gray-600">{{ activity.description|truncate(150) }}</p>
                            {% endif %}
                          </div>
                          {% if activity.priority %}
                            <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                              {% if activity.priority == 'high' %}bg-red-100 text-red-800
                              {% elif activity.priority == 'medium' %}bg-yellow-100 text-yellow-800
                              {% else %}bg-gray-100 text-gray-800
                              {% endif %}">
                              {{ activity.priority|capitalize }}
                            </span>
                          {% endif %}
                        </div>
                        
                        <!-- Metadados -->
                        <div class="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          <span class="flex items-center gap-1">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            {{ activity.due_date|datetimeformat("%d/%m/%Y %H:%M") }}
                          </span>
                          {% if activity.assigned_to %}
                            <span class="flex items-center gap-1">
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                              {{ activity.assigned_to }}
                            </span>
                          {% endif %}
                          {% if activity.activity_type == 'meeting' and activity.meeting_duration %}
                            <span class="flex items-center gap-1">
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              {{ activity.meeting_duration }} min
                            </span>
                          {% endif %}
                        </div>
                        
                        <!-- Comentários preview -->
                        {% if activity.comments %}
                          {% set comments = activity.comments|fromjson %}
                          {% if comments|length > 0 %}
                            <div class="mt-2 text-sm text-gray-500">
                              <span class="flex items-center gap-1">
                                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                                {{ comments|length }} comentário{{ 's' if comments|length > 1 else '' }}
                              </span>
                            </div>
                          {% endif %}
                        {% endif %}
                      </div>
                      
                      <!-- Ações -->
                      <div class="flex flex-col gap-2">
                        {% if activity.activity_type == 'task' %}
                          <button onclick="window.atividadesModule.markComplete('{{ activity.hs_row_id }}')" class="inline-flex items-center gap-1 rounded-md bg-green-50 px-3 py-1.5 text-sm font-medium text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2">
                            <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                            Concluir
                          </button>
                        {% endif %}
                        <button onclick="window.atividadesModule.showDetails('{{ activity.hs_row_id }}')" class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          Detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                {% endfor %}
              </div>
            {% else %}
              <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma atividade futura</h3>
                <p class="mt-1 text-sm text-gray-500">Comece criando uma nova atividade para este negócio.</p>
                <div class="mt-6">
                  <button onclick="window.atividadesModule.showNewActivityModal()" class="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                    <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                    Nova Atividade
                  </button>
                </div>
              </div>
            {% endif %}
          </div>
          
          <!-- Histórico de Atividades -->
          <div class="tab-content" data-tab-content="past" style="display: none;">
            {% if past_activities|length > 0 %}
              <div class="space-y-4">
                {% for activity in past_activities %}
                  <div class="activity-card past rounded-lg border border-gray-200 p-4 opacity-75" data-row-id="{{ activity.hs_row_id }}" data-activity-type="{{ activity.activity_type }}">
                    <div class="flex items-start gap-4">
                      <!-- Ícone do tipo de atividade -->
                      <div class="flex-shrink-0">
                        <div class="activity-icon h-10 w-10 rounded-full flex items-center justify-center bg-gray-100 text-gray-500">
                          {% if activity.status == 'completed' %}
                            <svg class="h-5 w-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
                          {% elif activity.status == 'cancelled' %}
                            <svg class="h-5 w-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                          {% else %}
                            {% if activity.activity_type == 'task' %}
                              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path></svg>
                            {% elif activity.activity_type == 'meeting' %}
                              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            {% elif activity.activity_type == 'call' %}
                              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
                            {% elif activity.activity_type == 'note' %}
                              <svg class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                            {% endif %}
                          {% endif %}
                        </div>
                      </div>
                      
                      <!-- Conteúdo da atividade -->
                      <div class="flex-1">
                        <div class="flex items-start justify-between">
                          <div>
                            <h4 class="text-base font-medium text-gray-900">{{ activity.title }}</h4>
                            {% if activity.description %}
                              <p class="mt-1 text-sm text-gray-600">{{ activity.description|truncate(150) }}</p>
                            {% endif %}
                          </div>
                          <span class="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            {% if activity.status == 'completed' %}bg-green-100 text-green-800
                            {% elif activity.status == 'cancelled' %}bg-red-100 text-red-800
                            {% else %}bg-gray-100 text-gray-800
                            {% endif %}">
                            {% if activity.status == 'completed' %}Concluído
                            {% elif activity.status == 'cancelled' %}Cancelado
                            {% else %}{{ activity.status|capitalize }}
                            {% endif %}
                          </span>
                        </div>
                        
                        <!-- Metadados -->
                        <div class="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                          {% if activity.completed_date %}
                            <span class="flex items-center gap-1">
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                              Concluído em {{ activity.completed_date|datetimeformat("%d/%m/%Y") }}
                            </span>
                          {% else %}
                            <span class="flex items-center gap-1">
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                              {{ activity.created_date|datetimeformat("%d/%m/%Y") }}
                            </span>
                          {% endif %}
                          {% if activity.created_by %}
                            <span class="flex items-center gap-1">
                              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
                              {{ activity.created_by }}
                            </span>
                          {% endif %}
                        </div>
                      </div>
                      
                      <!-- Ações -->
                      <div class="flex flex-col gap-2">
                        <button onclick="window.atividadesModule.showDetails('{{ activity.hs_row_id }}')" class="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                          <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  </div>
                {% endfor %}
              </div>
            {% else %}
              <div class="text-center py-8">
                <svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <h3 class="mt-2 text-sm font-medium text-gray-900">Nenhuma atividade no histórico</h3>
                <p class="mt-1 text-sm text-gray-500">As atividades concluídas aparecerão aqui.</p>
              </div>
            {% endif %}
          </div>
          
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Detalhes (será preenchido via JS) -->
  <div id="activity-details-modal" class="fixed inset-0 z-50 overflow-y-auto hidden">
    <div class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick="window.atividadesModule.closeDetailsModal()"></div>
      <span class="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
      <div class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
        <div id="activity-details-content">
          <!-- Conteúdo será inserido via JS -->
        </div>
      </div>
    </div>
  </div>

  <!-- Modal de Nova Atividade -->
  <div id="new-activity-modal" class="fixed inset-0 z-50 overflow-y-auto hidden">
    <div class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
      <div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onclick="window.atividadesModule.closeNewActivityModal()"></div>
      <span class="hidden sm:inline-block sm:h-screen sm:align-middle">&#8203;</span>
      <div class="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
        <form onsubmit="window.atividadesModule.createActivity(event)">
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <h3 class="text-lg font-medium text-gray-900 mb-4">Nova Atividade</h3>
            
            <div class="space-y-4">
              <div>
                <label class="block text-sm font-medium text-gray-700">Tipo</label>
                <select name="activity_type" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                  <option value="task">Tarefa</option>
                  <option value="meeting">Reunião</option>
                  <option value="call">Ligação</option>
                  <option value="note">Observação</option>
                </select>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Título</label>
                <input type="text" name="title" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Descrição</label>
                <textarea name="description" rows="3" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"></textarea>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Data/Hora</label>
                <input type="datetime-local" name="due_date" required class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-700">Prioridade</label>
                <select name="priority" class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm">
                  <option value="low">Baixa</option>
                  <option value="medium" selected>Média</option>
                  <option value="high">Alta</option>
                </select>
              </div>
            </div>
          </div>
          
          <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button type="submit" class="inline-flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm">
              Criar Atividade
            </button>
            <button type="button" onclick="window.atividadesModule.closeNewActivityModal()" class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

</div>

<script>
  // Dados das atividades para uso no JavaScript
  window.hubdbActivitiesData = {
    tableId: {{ table_id }},
    negocioId: {{ negocio_id|tojson }},
    activities: {{ all_activities|tojson }},
    futureCount: {{ future_activities|length }},
    pastCount: {{ past_activities|length }}
  };
</script>